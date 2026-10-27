import { assertSameOrigin } from "@/lib/security/csrf";
import { destroyCurrentSession } from "@/lib/auth/session";
import { errorResponse, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroyCurrentSession();
    return jsonOk({ message: "Sessão encerrada." });
  } catch (error) {
    return errorResponse(error);
  }
}
