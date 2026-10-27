import { assertSameOrigin } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/db";
import { deletePrivateFile, savePrivateFile, validateUploadedFile } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { ensureEntitlementsForOrder } from "@/lib/payments/process";

export const runtime = "nodejs";

const MAX_FORM_BYTES = 32 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let pathname: string | null = null;
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_FORM_BYTES) throw new AppError("Arquivo muito grande.", 413);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError("Produto não encontrado.", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Selecione um arquivo.", 400);

    const validated = await validateUploadedFile(file);
    pathname = await savePrivateFile({
      productId: id,
      extension: validated.extension,
      buffer: validated.buffer,
      contentType: validated.mimeType,
    });

    const record = await prisma.productFile.create({
      data: {
        productId: id,
        pathname,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        sizeBytes: validated.buffer.length,
        sha256: validated.sha256,
      },
    });

    const paidOrders = await prisma.order.findMany({
      where: { status: "PAID", items: { some: { productId: id } } },
      select: { id: true },
    });
    if (paidOrders.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const order of paidOrders) {
          await ensureEntitlementsForOrder(tx, order.id);
        }
      }).catch(() => undefined);
    }

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.product_file_uploaded",
      entityType: "product_file",
      entityId: record.id,
      metadata: { productId: id, originalName: validated.originalName, sizeBytes: record.sizeBytes },
    });

    return jsonOk({
      fileId: record.id,
      originalName: record.originalName,
      sizeBytes: record.sizeBytes,
      message: "Arquivo enviado ao armazenamento privado.",
    });
  } catch (error) {
    if (pathname) await deletePrivateFile(pathname).catch(() => undefined);
    return errorResponse(error);
  }
}
