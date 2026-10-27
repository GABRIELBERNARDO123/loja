import type { DownloadEntitlement, Order, ProductFile } from "@prisma/client";
import { prisma } from "@/lib/db";

export class DownloadError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "DownloadError";
    this.status = status;
  }
}

export type DownloadableEntitlement = DownloadEntitlement & {
  productFile: ProductFile;
  order: Order;
};

const ENTITLEMENT_ID_PATTERN = /^[a-z0-9]{20,40}$/i;

export async function authorizeDownload(
  userId: string,
  entitlementId: string,
): Promise<DownloadableEntitlement> {
  if (!ENTITLEMENT_ID_PATTERN.test(entitlementId)) {
    throw new DownloadError("Arquivo não encontrado.", 404);
  }

  const entitlement = await prisma.downloadEntitlement.findUnique({
    where: { id: entitlementId },
    include: { productFile: true, order: true },
  });

  // A resposta é intencionalmente idêntica para inexistente e de outro usuário,
  // evitando enumeração de permissões (IDOR/BOLA).
  if (!entitlement || entitlement.userId !== userId) {
    throw new DownloadError("Arquivo não encontrado.", 404);
  }
  if (entitlement.status !== "ACTIVE" || entitlement.order.status !== "PAID") {
    throw new DownloadError("Acesso não autorizado a este arquivo.", 403);
  }
  if (entitlement.expiresAt.getTime() <= Date.now()) {
    throw new DownloadError("O prazo de acesso a este arquivo expirou.", 403);
  }

  return entitlement;
}

export async function consumeDownload(
  userId: string,
  entitlement: Pick<DownloadEntitlement, "id" | "maxDownloads">,
): Promise<void> {
  const updated = await prisma.downloadEntitlement.updateMany({
    where: {
      id: entitlement.id,
      userId,
      status: "ACTIVE",
      downloadCount: { lt: entitlement.maxDownloads },
      expiresAt: { gt: new Date() },
    },
    data: { downloadCount: { increment: 1 } },
  });

  if (updated.count !== 1) {
    throw new DownloadError(
      "Limite de downloads atingido. Fale com o suporte para avaliar a reativação.",
      429,
    );
  }
}

export async function releaseFailedDownload(userId: string, entitlementId: string): Promise<void> {
  await prisma.downloadEntitlement
    .updateMany({
      where: { id: entitlementId, userId, downloadCount: { gt: 0 } },
      data: { downloadCount: { decrement: 1 } },
    })
    .catch(() => undefined);
}
