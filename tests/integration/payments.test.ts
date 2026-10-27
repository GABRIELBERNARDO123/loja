import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MpPayment } from "@/lib/payments/mercadopago";
import { processProviderPayment } from "@/lib/payments/process";
import { createOrderFromCart } from "@/lib/orders";
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

beforeEach(async () => {
  // Each test creates its own isolated user and order.
});

async function createOrder(priceCents = 1490, withFiles = 2) {
  const user = await createTestUser();
  const { product } = await createTestProduct({ priceCents, withFile: false });
  for (let index = 0; index < withFiles; index += 1) {
    await prisma.productFile.create({
      data: {
        productId: product.id,
        pathname: `products/${product.id}/file-${index}-${randomUUID()}.pdf`,
        originalName: `arquivo-${index}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 100,
        sha256: "b".repeat(64),
      },
    });
  }
  await putProductInCart(user.id, product.id);
  const { order } = await createOrderFromCart({
    userId: user.id,
    customerName: "Cliente Pagamento",
    customerEmail: user.email,
    checkoutKey: randomUUID(),
  });
  return { user, product, order };
}

function providerPayment(orderId: string, overrides: Partial<MpPayment> = {}): MpPayment {
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
    ...overrides,
  };
}

describe("confirmação de pagamento", () => {
  it("só libera entitlements após pagamento aprovado e validado", async () => {
    const { user, order } = await createOrder();

    const result = await processProviderPayment({
      payment: providerPayment(order.id),
      signatureValid: true,
      payloadHash: "hash-1",
    });
    expect(result).toEqual({ ok: true, result: "approved" });

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("PAID");
    expect(updated.paidAt).not.toBeNull();

    const entitlements = await prisma.downloadEntitlement.findMany({ where: { orderId: order.id, userId: user.id } });
    expect(entitlements).toHaveLength(2);
    expect(entitlements.every((item) => item.status === "ACTIVE")).toBe(true);
    expect(entitlements.every((item) => item.maxDownloads === 5)).toBe(true);
  });

  it("não libera pedido quando o valor confirmado é zero", async () => {
    const { order } = await createOrder();
    const result = await processProviderPayment({
      payment: providerPayment(order.id, { transaction_amount: 0 }),
      signatureValid: true,
      payloadHash: "hash-zero",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result).toBe("valor_divergente");

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("PENDING");
    expect(await prisma.downloadEntitlement.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("rejeita notificação duplicada sem duplicar entitlements", async () => {
    const { order } = await createOrder();
    const payment = providerPayment(order.id);
    const first = await processProviderPayment({ payment, signatureValid: true, payloadHash: "hash-a" });
    const second = await processProviderPayment({ payment, signatureValid: true, payloadHash: "hash-b" });
    expect(first).toEqual({ ok: true, result: "approved" });
    expect(second).toEqual({ ok: true, result: "duplicate" });
    expect(await prisma.downloadEntitlement.count({ where: { orderId: order.id } })).toBe(2);
    expect(await prisma.paymentEvent.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("rejeita referência de pedido de outra compra", async () => {
    const { order } = await createOrder();
    const other = await createOrder();
    const result = await processProviderPayment({
      payment: providerPayment(other.order.id),
      signatureValid: true,
      payloadHash: "hash-ref",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result).toBe("approved");
    const target = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(target.status).toBe("PENDING");
  });

  it("revoga downloads após estorno/reembolso", async () => {
    const { order } = await createOrder();
    const payment = providerPayment(order.id);
    await processProviderPayment({ payment, signatureValid: true, payloadHash: "hash-pay" });
    const refund = await processProviderPayment({
      payment: { ...payment, status: "refunded", status_detail: "refunded" },
      signatureValid: true,
      payloadHash: "hash-refund",
    });
    expect(refund).toEqual({ ok: true, result: "status_updated" });
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("REFUNDED");
    const entitlements = await prisma.downloadEntitlement.findMany({ where: { orderId: order.id } });
    expect(entitlements.every((item) => item.status === "REVOKED")).toBe(true);
  });

  it("registra evento para pedido inexistente sem alterar nada", async () => {
    const result = await processProviderPayment({
      payment: providerPayment("pedido-inexistente"),
      signatureValid: false,
      payloadHash: "hash-missing",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result).toBe("pedido_nao_encontrado");
    expect(await prisma.paymentEvent.count({ where: { result: "pedido_nao_encontrado" } })).toBe(1);
  });
});
