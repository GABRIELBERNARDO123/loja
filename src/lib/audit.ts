import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipHash?: string | null;
};

export async function writeAuditLog(input: AuditInput, client?: Prisma.TransactionClient): Promise<void> {
  try {
    const db = client ?? prisma;
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipHash: input.ipHash ?? null,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar auditoria", error instanceof Error ? error.message : "erro");
  }
}
