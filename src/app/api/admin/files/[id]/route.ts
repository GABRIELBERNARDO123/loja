import { assertSameOrigin } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/db";
import { deletePrivateFile } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;

    const file = await prisma.productFile.findUnique({
      where: { id },
      include: { _count: { select: { entitlements: true } } },
    });
    if (!file) throw new AppError("Arquivo não encontrado.", 404);
    if (file._count.entitlements > 0) {
      throw new AppError(
        "Este arquivo já possui acessos vinculados a compras e não pode ser removido. Desative o produto ou envie uma nova versão.",
        409,
      );
    }

    await deletePrivateFile(file.pathname);
    await prisma.productFile.delete({ where: { id } });

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.product_file_deleted",
      entityType: "product_file",
      entityId: id,
      metadata: { productId: file.productId, originalName: file.originalName },
    });

    return jsonOk({ message: "Arquivo removido." });
  } catch (error) {
    return errorResponse(error);
  }
}
