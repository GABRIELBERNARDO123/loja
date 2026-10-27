import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { MpPayment } from "@/lib/payments/mercadopago";
import { processProviderPayment } from "@/lib/payments/process";
import { createOrderFromCart } from "@/lib/orders";
import { authorizeDownload, DownloadError, consumeDownload } from "@/lib/downloads";
import {
  createTestProduct,
  createTestUser,
  prisma,
  putProductInCart,
  resetDatabase,
} from "../helpers/db";

beforeAll(async () => {
  await resetDatabase();
});

function approvedPayment(orderId: string): MpPayment {
  return {
    id: `mp-${randomUUID()}`,
    status: "approved",
    status_detail: "accredited",
    transaction_amount: 14.9,
    currency_id: "BRL",
    external_reference: orderId,
    collector_id: "123456",
    live_mode: false,
    payment_method_id: "pix",
  };
}

async function paidOrderWithEntitlement() {
  const owner = await createTestUser();
  const stranger = await createTestUser();
  const { product, file } = await createTestProduct({ priceCents: 1490 });
  if (!file) throw new Error("Arquivo de teste não criado.");
  await putProductInCart(owner.id, product.id);
  const { order } = await createOrderFromCart({
    userId: owner.id,
    customerName: "Dono do acesso",
    customerEmail: owner.email,
    checkoutKey: randomUUID(),
  });
  const result = await processProviderPayment({
    payment: approvedPayment(order.id),
    signatureValid: true,
    payloadHash: randomUUID(),
  });
  expect(result).toEqual({ ok: true, result: "approved" });
  const entitlement = await prisma.downloadEntitlement.findFirstOrThrow({
    where: { orderId: order.id, userId: owner.id },
  });
  return { owner, stranger, product, file, order, entitlement };
}

describe("autorização de download", () => {
  it("libera o acesso apenas para o comprador com pedido pago", async () => {
    const { owner, entitlement } = await paidOrderWithEntitlement();
    const authorized = await authorizeDownload(owner.id, entitlement.id);
    expect(authorized.id).toBe(entitlement.id);
  });

  it("impede acesso de outro usuário ao mesmo arquivo (IDOR/BOLA)", async () => {
    const { stranger, entitlement } = await paidOrderWithEntitlement();
    await expect(authorizeDownload(stranger.id, entitlement.id)).rejects.toMatchObject({
      name: "DownloadError",
      status: 404,
    });
  });

  it("impede download quando o pedido ainda não foi pago", async () => {
    const user = await createTestUser();
    const { product, file } = await createTestProduct();
    if (!file) throw new Error("Arquivo de teste não criado.");
    await putProductInCart(user.id, product.id);
    const { order } = await createOrderFromCart({
      userId: user.id,
      customerName: "Cliente Pendente",
      customerEmail: user.email,
      checkoutKey: randomUUID(),
    });
    const entitlement = await prisma.downloadEntitlement.create({
      data: {
        userId: user.id,
        orderId: order.id,
        orderItemId: (await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).id,
        productId: product.id,
        productFileId: file.id,
        maxDownloads: 5,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await expect(authorizeDownload(user.id, entitlement.id)).rejects.toMatchObject({
      name: "DownloadError",
      status: 403,
    });
  });

  it("impede download após revogação, expiração ou id inexistente", async () => {
    const { owner, entitlement } = await paidOrderWithEntitlement();
    await prisma.downloadEntitlement.update({
      where: { id: entitlement.id },
      data: { status: "REVOKED" },
    });
    await expect(authorizeDownload(owner.id, entitlement.id)).rejects.toBeInstanceOf(DownloadError);

    await prisma.downloadEntitlement.update({
      where: { id: entitlement.id },
      data: { status: "ACTIVE", expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(authorizeDownload(owner.id, entitlement.id)).rejects.toMatchObject({ status: 403 });

    await expect(authorizeDownload(owner.id, "a".repeat(25))).rejects.toMatchObject({ status: 404 });
  });

  it("aplica limite atômico de downloads e registra incremento", async () => {
    const { owner, entitlement } = await paidOrderWithEntitlement();
    await prisma.downloadEntitlement.update({ where: { id: entitlement.id }, data: { maxDownloads: 1 } });

    await consumeDownload(owner.id, { id: entitlement.id, maxDownloads: 1 });
    const afterFirst = await prisma.downloadEntitlement.findUniqueOrThrow({ where: { id: entitlement.id } });
    expect(afterFirst.downloadCount).toBe(1);

    await expect(
      consumeDownload(owner.id, { id: entitlement.id, maxDownloads: 1 }),
    ).rejects.toMatchObject({ name: "DownloadError", status: 429 });
    const afterSecond = await prisma.downloadEntitlement.findUniqueOrThrow({ where: { id: entitlement.id } });
    expect(afterSecond.downloadCount).toBe(1);
  });
});

describe("isolamento de pedidos", () => {
  it("não retorna pedido de outro cliente", async () => {
    const { getOrderForUser } = await import("@/lib/orders");
    const { owner, stranger, order } = await paidOrderWithEntitlement();
    const own = await getOrderForUser(order.id, owner.id);
    expect(own?.id).toBe(order.id);
    const other = await getOrderForUser(order.id, stranger.id);
    expect(other).toBeNull();
  });
});
