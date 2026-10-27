import { beforeAll, describe, expect, it } from "vitest";
import { consumeVerificationToken, createVerificationToken } from "@/lib/auth/tokens";
import { createTestUser, prisma, resetDatabase } from "../helpers/db";

beforeAll(async () => {
  await resetDatabase();
});

describe("tokens de verificação", () => {
  it("consome um token de redefinição apenas uma vez", async () => {
    const user = await createTestUser();
    const token = await createVerificationToken(user.id, "PASSWORD_RESET");
    const first = await consumeVerificationToken(token, "PASSWORD_RESET");
    expect(first?.userId).toBe(user.id);
    const second = await consumeVerificationToken(token, "PASSWORD_RESET");
    expect(second).toBeNull();
  });

  it("rejeita token usado com o tipo errado", async () => {
    const user = await createTestUser();
    const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
    const result = await consumeVerificationToken(token, "PASSWORD_RESET");
    expect(result).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const user = await createTestUser();
    const token = await createVerificationToken(user.id, "PASSWORD_RESET");
    const record = await prisma.verificationToken.findFirstOrThrow({ where: { userId: user.id } });
    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await consumeVerificationToken(token, "PASSWORD_RESET");
    expect(result).toBeNull();
  });

  it("invalida tokens anteriores ao gerar um novo", async () => {
    const user = await createTestUser();
    const first = await createVerificationToken(user.id, "PASSWORD_RESET");
    const second = await createVerificationToken(user.id, "PASSWORD_RESET");
    expect(await consumeVerificationToken(first, "PASSWORD_RESET")).toBeNull();
    expect((await consumeVerificationToken(second, "PASSWORD_RESET"))?.userId).toBe(user.id);
  });
});
