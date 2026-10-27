import { cookies } from "next/headers";
import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { isProduction } from "@/lib/env";

export const SESSION_COOKIE = "loja_session";
const SESSION_TTL_DAYS = 7;
const ADMIN_SESSION_TTL_HOURS = 12;

export type SessionUser = User & { role: Role };

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createSession(
  userId: string,
  options: { mfaVerified: boolean; ipHash?: string | null; userAgent?: string | null; isAdmin?: boolean },
): Promise<string> {
  const rawToken = randomToken(32);
  const ttlMs = options.isAdmin
    ? ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000
    : SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

  await prisma.session.create({
    data: {
      tokenHash: sha256(rawToken),
      userId,
      mfaVerified: options.mfaVerified,
      ipHash: options.ipHash ?? null,
      userAgent: options.userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, rawToken, cookieOptions(Math.floor(ttlMs / 1000)));
  return rawToken;
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(rawToken) } });
  }
  store.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function revokeOtherSessions(userId: string, currentRawToken: string | undefined): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(currentRawToken ? { tokenHash: { not: sha256(currentRawToken) } } : {}),
    },
  });
}

export async function getCurrentSession(): Promise<{
  session: { id: string; mfaVerified: boolean; expiresAt: Date };
  user: SessionUser;
} | null> {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: { include: { role: true } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    session: { id: session.id, mfaVerified: session.mfaVerified, expiresAt: session.expiresAt },
    user: session.user,
  };
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const current = await getCurrentSession();
  return current?.user ?? null;
});

export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { mfaVerified: true },
  });
}

export async function currentRawSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}
