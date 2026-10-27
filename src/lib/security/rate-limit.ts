import { prisma } from "@/lib/db";
import { hashIp } from "@/lib/security/crypto";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Muitas tentativas. Aguarde alguns instantes e tente novamente.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function enforceRateLimit({ key, limit, windowSeconds }: RateLimitOptions): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "rate_limits" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, now(), 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limits"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN 1
        ELSE "rate_limits"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "rate_limits"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN now()
        ELSE "rate_limits"."windowStart"
      END,
      "expiresAt" = now() + make_interval(secs => ${windowSeconds})
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  if (count > limit) throw new RateLimitError(windowSeconds);
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip") ?? null;
}

export async function rateLimitByIp(
  headers: Headers,
  scope: string,
  limit: number,
  windowSeconds: number,
  extra = "",
): Promise<string> {
  const ip = clientIpFromHeaders(headers) ?? "unknown";
  const hashed = hashIp(ip) ?? "unknown";
  await enforceRateLimit({
    key: `${scope}:${hashed}:${extra}`,
    limit,
    windowSeconds,
  });
  return hashed;
}

export async function enforceUserRateLimit(
  userId: string,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  await enforceRateLimit({ key: `${scope}:user:${userId}`, limit, windowSeconds });
}
