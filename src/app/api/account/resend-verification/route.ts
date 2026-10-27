import { assertSameOrigin } from "@/lib/security/csrf";
import { requireUserApi } from "@/lib/auth/guards";
import { errorResponse, jsonOk } from "@/lib/http";
import { createVerificationToken } from "@/lib/auth/tokens";
import { appUrl } from "@/lib/env";
import { buildEmailLayout, sendEmail } from "@/lib/email";
import { getStoreSettings } from "@/lib/settings";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUserApi();
    await enforceUserRateLimit(user.id, "resend-verification", 3, 3600);

    const current = await prisma.user.findUnique({ where: { id: user.id } });
    if (!current) return errorResponse(new Error("Usuário não encontrado."));
    if (!current.emailVerifiedAt) {
      const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
      const settings = await getStoreSettings();
      const link = `${appUrl()}/verificar-email?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: `Confirme seu e-mail — ${settings.storeName}`,
        text: `Olá, ${user.name}.\n\nConfirme seu e-mail acessando:\n${link}\n\nO link expira em 24 horas.`,
        html: buildEmailLayout(settings.storeName, "Confirme seu e-mail", `Olá, ${user.name}.\n\nConfirme seu e-mail:\n${link}`),
      }).catch(() => undefined);
    }

    return jsonOk({ message: "Se necessário, enviaremos um novo link." });
  } catch (error) {
    return errorResponse(error);
  }
}
