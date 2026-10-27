import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword, passwordPolicyIssues } from "../src/lib/security/password";
import { encryptTotpSecret, generateTotpSecret, totpUri } from "../src/lib/auth/totp";
import { getEnv } from "../src/lib/env";
import { normalizeEmail } from "../src/lib/security/crypto";
import { ensureStoreSettings } from "../src/lib/settings";

const prisma = new PrismaClient();

async function main() {
  getEnv();
  const email = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const name = (process.env.ADMIN_NAME ?? "Administrador").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const providedSecret = (process.env.ADMIN_TOTP_SECRET ?? "").trim().replace(/\s+/g, "").toUpperCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Defina ADMIN_EMAIL com um e-mail válido.");
  }
  if (passwordPolicyIssues(password).length > 0) {
    throw new Error(`ADMIN_PASSWORD inválida: ${passwordPolicyIssues(password).join(" ")}`);
  }

  const role = await prisma.role.upsert({
    where: { name: "ADMIN" },
    create: { name: "ADMIN", description: "Administrador da loja" },
    update: {},
  });
  await ensureStoreSettings();

  const existing = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (existing) {
    throw new Error(
      "Já existe uma conta com este e-mail. Para redefinir a senha ou o TOTP, use o fluxo administrativo controlado. Nenhuma alteração foi feita.",
    );
  }

  const secret = providedSecret || generateTotpSecret();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: role.id,
      emailVerifiedAt: new Date(),
      totpEnabled: true,
      totpSecretEncrypted: encryptTotpSecret(secret),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      action: "admin.bootstrap_created",
      entityType: "user",
      entityId: user.id,
    },
  });

  const settings = await ensureStoreSettings();
  const uri = totpUri(secret, email, settings.storeName);

  console.log("\nAdministrador criado com sucesso.");
  console.log(`E-mail: ${email}`);
  console.log("\nConfigure este segredo TOTP no aplicativo autenticador (guarde fora do repositório):");
  console.log(secret);
  console.log("\nURI de provisionamento:");
  console.log(uri);
  console.log("\nAcesse /entrar e informe o código de 6 dígitos.\n");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
