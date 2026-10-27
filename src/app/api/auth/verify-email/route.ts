import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertJsonRequest } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { consumeVerificationToken } from "@/lib/auth/tokens";
import { rateLimitByIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    await rateLimitByIp(request.headers, "verify-email", 20, 3600);
    const body = schema.parse(await readJson(request));
    const token = await consumeVerificationToken(body.token, "EMAIL_VERIFICATION");
    if (!token) throw new AppError("Link inválido ou expirado.", 400);

    await prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });

    return jsonOk({ message: "E-mail confirmado com sucesso." });
  } catch (error) {
    return errorResponse(error);
  }
}
