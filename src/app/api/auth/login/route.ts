import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/security/password";
import { assertJsonRequest } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonError, jsonOk, readJson, safeNextPath } from "@/lib/http";
import { normalizeEmail, sha256 } from "@/lib/security/crypto";
import { rateLimitByIp } from "@/lib/security/rate-limit";
import { createSession } from "@/lib/auth/session";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$9UVTQ5txHbqHLJF1BR9pOQ$ZYlyRpZTN5zyabYDVrBnCNtiBjg4AzRVvXqCq9joENY";

const schema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128),
  next: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const body = schema.parse(await readJson(request));
    const email = normalizeEmail(body.email);
    const ipHash = await rateLimitByIp(request.headers, "login:ip", 25, 900);
    await rateLimitByIp(request.headers, "login:email", 6, 900, sha256(email).slice(0, 16));

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const valid = user
      ? await verifyPassword(user.passwordHash, body.password)
      : await verifyPassword(DUMMY_HASH, body.password);

    if (!user || !valid || !user.isActive) {
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: attempts >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
          },
        });
      }
      await writeAuditLog({
        actorEmail: email,
        action: "auth.login_failed",
        entityType: "user",
        entityId: user?.id ?? null,
        ipHash,
      });
      return jsonError("E-mail ou senha inválidos.", 401);
    }

    const isAdmin = user.role.name === "ADMIN";
    await createSession(user.id, {
      mfaVerified: !isAdmin,
      ipHash,
      userAgent: request.headers.get("user-agent"),
      isAdmin,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await mergeGuestCartIntoUser(user.id).catch(() => undefined);

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ipHash,
    });

    const next = isAdmin
      ? safeNextPath(body.next, "/admin")
      : safeNextPath(body.next, "/conta");

    return jsonOk({
      message: "Login realizado.",
      requires2fa: isAdmin,
      next: isAdmin ? `/verificar-2fa?next=${encodeURIComponent(next)}` : next,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
