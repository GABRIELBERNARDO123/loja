import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertJsonRequest } from "@/lib/security/csrf";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { consumeVerificationToken } from "@/lib/auth/tokens";
import { hashPassword, passwordPolicyIssues } from "@/lib/security/password";
import { rateLimitByIp } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const ipHash = await rateLimitByIp(request.headers, "reset", 10, 3600);
    const body = schema.parse(await readJson(request));
    const issues = passwordPolicyIssues(body.password);
    if (issues.length > 0) throw new AppError(issues.join(" "), 422);

    const token = await consumeVerificationToken(body.token, "PASSWORD_RESET");
    if (!token) throw new AppError("Link inválido ou expirado. Solicite uma nova recuperação.", 400);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.session.deleteMany({ where: { userId: token.userId } });
      return updated;
    });

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.password_reset",
      entityType: "user",
      entityId: user.id,
      ipHash,
    });

    return jsonOk({ message: "Senha alterada. Entre com a nova senha." });
  } catch (error) {
    return errorResponse(error);
  }
}
