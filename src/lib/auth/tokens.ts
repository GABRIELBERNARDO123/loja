import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/crypto";

const TTL: Record<TokenType, number> = {
  PASSWORD_RESET: 30 * 60 * 1000,
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
};

export async function createVerificationToken(userId: string, type: TokenType): Promise<string> {
  const rawToken = randomToken(32);
  await prisma.$transaction([
    prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.verificationToken.create({
      data: {
        tokenHash: sha256(rawToken),
        userId,
        type,
        expiresAt: new Date(Date.now() + TTL[type]),
      },
    }),
  ]);
  return rawToken;
}

export async function consumeVerificationToken(
  rawToken: string,
  type: TokenType,
): Promise<{ userId: string } | null> {
  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
  });
  if (!token || token.type !== type) return null;
  if (token.usedAt || token.expiresAt.getTime() <= Date.now()) return null;

  const updated = await prisma.verificationToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (updated.count !== 1) return null;
  return { userId: token.userId };
}
