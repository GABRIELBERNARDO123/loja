import { z } from "zod";
import { getCurrentSession, markSessionMfaVerified } from "@/lib/auth/session";
import { verifyTotpToken } from "@/lib/auth/totp";
import { assertJsonRequest } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonOk, readJson, safeNextPath } from "@/lib/http";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Informe o código de 6 dígitos."),
  next: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const current = await getCurrentSession();
    if (!current) throw new AppError("Sessão expirada. Entre novamente.", 401);
    if (current.user.role.name !== "ADMIN") throw new AppError("Acesso negado.", 403);
    if (!current.user.totpEnabled || !current.user.totpSecretEncrypted) {
      throw new AppError("MFA não configurado. Contate o responsável técnico.", 403);
    }

    await enforceUserRateLimit(current.user.id, "2fa", 6, 300);
    const body = schema.parse(await readJson(request));

    if (!verifyTotpToken(current.user.totpSecretEncrypted, body.code)) {
      await writeAuditLog({
        actorId: current.user.id,
        actorEmail: current.user.email,
        action: "auth.2fa_failed",
        entityType: "user",
        entityId: current.user.id,
      });
      throw new AppError("Código inválido ou expirado.", 401);
    }

    await markSessionMfaVerified(current.session.id);
    await prisma.session.deleteMany({
      where: {
        userId: current.user.id,
        mfaVerified: false,
        id: { not: current.session.id },
        expiresAt: { lt: new Date(Date.now() + 60 * 60 * 1000) },
      },
    });

    await writeAuditLog({
      actorId: current.user.id,
      actorEmail: current.user.email,
      action: "auth.2fa_success",
      entityType: "user",
      entityId: current.user.id,
    });

    return jsonOk({ message: "Verificação concluída.", next: safeNextPath(body.next, "/admin") });
  } catch (error) {
    return errorResponse(error);
  }
}
