import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertJsonRequest } from "@/lib/security/csrf";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { normalizeEmail, sha256 } from "@/lib/security/crypto";
import { rateLimitByIp } from "@/lib/security/rate-limit";
import { createVerificationToken } from "@/lib/auth/tokens";
import { appUrl } from "@/lib/env";
import { buildEmailLayout, sendEmail } from "@/lib/email";
import { getStoreSettings } from "@/lib/settings";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().email().max(160) });

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const body = schema.parse(await readJson(request));
    const email = normalizeEmail(body.email);
    await rateLimitByIp(request.headers, "forgot:ip", 10, 900);
    await rateLimitByIp(request.headers, "forgot:email", 4, 900, sha256(email).slice(0, 16));

    const user = await prisma.user.findUnique({ where: { email, isActive: true } });
    if (user) {
      const token = await createVerificationToken(user.id, "PASSWORD_RESET");
      const settings = await getStoreSettings();
      const link = `${appUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: `Redefinição de senha — ${settings.storeName}`,
        text: `Olá, ${user.name}.\n\nRecebemos um pedido para redefinir sua senha. Acesse o link abaixo (válido por 30 minutos):\n${link}\n\nSe não foi você, ignore esta mensagem.`,
        html: buildEmailLayout(
          settings.storeName,
          "Redefinir senha",
          `Olá, ${user.name}.\n\nAcesse o link abaixo para criar uma nova senha. Ele expira em 30 minutos:\n${link}\n\nSe não foi você, ignore esta mensagem.`,
        ),
      }).catch(() => undefined);
    }

    return jsonOk({
      message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
