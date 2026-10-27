import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireUserApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hashPassword, passwordPolicyIssues, verifyPassword } from "@/lib/security/password";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";
import { currentRawSessionToken, revokeOtherSessions } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await requireUserApi();
    await enforceUserRateLimit(user.id, "password-change", 5, 3600);
    const body = schema.parse(await readJson(request));

    const valid = await verifyPassword(user.passwordHash, body.currentPassword);
    if (!valid) throw new AppError("Senha atual incorreta.", 401);

    const issues = passwordPolicyIssues(body.newPassword);
    if (issues.length > 0) throw new AppError(issues.join(" "), 422);
    if (await verifyPassword(user.passwordHash, body.newPassword)) {
      throw new AppError("A nova senha deve ser diferente da atual.", 422);
    }

    const passwordHash = await hashPassword(body.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await revokeOtherSessions(user.id, await currentRawSessionToken());
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "account.password_changed",
      entityType: "user",
      entityId: user.id,
    });

    return jsonOk({ message: "Senha alterada com sucesso." });
  } catch (error) {
    return errorResponse(error);
  }
}
