import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireUserApi } from "@/lib/auth/guards";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ name: z.string().trim().min(2).max(120) });

export async function PATCH(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await requireUserApi();
    await enforceUserRateLimit(user.id, "profile-update", 10, 3600);
    const body = schema.parse(await readJson(request));
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: body.name.replace(/\s+/g, " ") },
    });
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "account.profile_updated",
      entityType: "user",
      entityId: user.id,
    });
    return jsonOk({ message: "Perfil atualizado.", name: updated.name });
  } catch (error) {
    return errorResponse(error);
  }
}
