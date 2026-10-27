import { assertSameOrigin } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk } from "@/lib/http";
import { savePublicImage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 6 * 1024 * 1024) throw new AppError("Imagem muito grande.", 413);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Selecione uma imagem.", 400);

    const url = await savePublicImage(file);
    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.image_uploaded",
      entityType: "image",
      metadata: { url },
    });

    return jsonOk({ url, message: "Imagem enviada." });
  } catch (error) {
    return errorResponse(error);
  }
}
