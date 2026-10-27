import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireUserApi } from "@/lib/auth/guards";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { currentRawSessionToken, destroyCurrentSession, revokeOtherSessions } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ mode: z.enum(["others", "all"]) });

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await requireUserApi();
    const body = schema.parse(await readJson(request));

    if (body.mode === "others") {
      await revokeOtherSessions(user.id, await currentRawSessionToken());
    } else {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await destroyCurrentSession();
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: body.mode === "all" ? "account.sessions_revoked_all" : "account.sessions_revoked_others",
      entityType: "user",
      entityId: user.id,
    });

    return jsonOk({ message: "Sessões encerradas." });
  } catch (error) {
    return errorResponse(error);
  }
}
