import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, passwordPolicyIssues } from "@/lib/security/password";
import { assertJsonRequest } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { normalizeEmail } from "@/lib/security/crypto";
import { rateLimitByIp } from "@/lib/security/rate-limit";
import { createVerificationToken } from "@/lib/auth/tokens";
import { sendEmail, buildEmailLayout } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const ipHash = await rateLimitByIp(request.headers, "register", 8, 3600);
    const body = schema.parse(await readJson(request));
    const issues = passwordPolicyIssues(body.password);
    if (issues.length > 0) throw new AppError(issues.join(" "), 422);

    const email = normalizeEmail(body.email);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const role = await prisma.role.upsert({
        where: { name: "CUSTOMER" },
        create: { name: "CUSTOMER", description: "Cliente da loja" },
        update: {},
      });
      const passwordHash = await hashPassword(body.password);
      const user = await prisma.user.create({
        data: {
          name: body.name.replace(/\s+/g, " "),
          email,
          passwordHash,
          roleId: role.id,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email,
        action: "auth.register",
        entityType: "user",
        entityId: user.id,
        ipHash,
      });

      const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
      const settings = await getStoreSettings();
      const link = `${appUrl()}/verificar-email?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: `Confirme seu e-mail — ${settings.storeName}`,
        text: `Olá, ${user.name}.\n\nConfirme seu e-mail para ativar todos os recursos da conta:\n${link}\n\nO link expira em 24 horas.`,
        html: buildEmailLayout(
          settings.storeName,
          "Confirme seu e-mail",
          `Olá, ${user.name}.\n\nConfirme seu e-mail acessando o link abaixo (válido por 24 horas):\n${link}`,
        ),
      }).catch(() => undefined);
    } else {
      await hashPassword(body.password).catch(() => undefined);
    }

    return jsonOk({
      message: "Cadastro recebido. Verifique seu e-mail e entre com sua senha.",
      next: "/entrar",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
