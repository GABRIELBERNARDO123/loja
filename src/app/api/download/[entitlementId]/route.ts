import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { enforceUserRateLimit, rateLimitByIp } from "@/lib/security/rate-limit";
import { errorResponse, jsonError } from "@/lib/http";
import { authorizeDownload, consumeDownload, releaseFailedDownload } from "@/lib/downloads";
import { openPrivateFile, safeContentDisposition } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ entitlementId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Não autenticado.", 401);

  const { entitlementId } = await context.params;

  let entitlement;
  let ipHash: string;
  try {
    ipHash = await rateLimitByIp(request.headers, "download", 40, 60, user.id);
    await enforceUserRateLimit(user.id, "download-total", 300, 3600);
    entitlement = await authorizeDownload(user.id, entitlementId);
    await consumeDownload(user.id, entitlement);
  } catch (error) {
    return errorResponse(error);
  }

  const file = await openPrivateFile(entitlement.productFile.pathname, entitlement.productFile.mimeType);

  if (!file) {
    await releaseFailedDownload(user.id, entitlement.id);
    await prisma.downloadLog.create({
      data: {
        entitlementId: entitlement.id,
        userId: user.id,
        ipHash,
        userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
        success: false,
      },
    }).catch(() => undefined);
    return jsonError("Arquivo temporariamente indisponível. Contate o suporte.", 404);
  }

  await prisma.downloadLog.create({
    data: {
      entitlementId: entitlement.id,
      userId: user.id,
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      success: true,
    },
  }).catch(() => undefined);

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Content-Disposition": safeContentDisposition(entitlement.productFile.originalName),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size !== null) headers.set("Content-Length", String(file.size));

  return new Response(file.body, { status: 200, headers });
}
