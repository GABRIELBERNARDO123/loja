import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createTestCoupon,
  createTestProduct,
  createTestUser,
  prisma,
  putProductInCart,
  resetDatabase,
} from "../helpers/db";
import { createOrderFromCart, OrderError } from "@/lib/orders";

beforeAll(async () => {
  await resetDatabase();
});

async function prepareCart(options: { priceCents?: number; coupon?: boolean } = {}) {
  const user = await createTestUser();
  const { product } = await createTestProduct({ priceCents: options.priceCents ?? 1490 });
  await putProductInCart(user.id, product.id);
  const coupon = options.coupon ? await createTestCoupon({ value: 10 }) : null;
  return { user, product, coupon };
}

describe("criação de pedido", () => {
  it("usa o preço oficial do banco e ignora valores manipulados no payload", async () => {
    const { user, product } = await prepareCart();
    const payload = {
      userId: user.id,
      customerName: "Cliente Teste",
      customerEmail: user.email,
      checkoutKey: randomUUID(),
      total: 0,
      totalCents: 0,
      amount: 0,
      price: 0,
      subtotalCents: 0,
    } as Parameters<typeof createOrderFromCart>[0];

    const { order } = await createOrderFromCart(payload);
    expect(order.totalCents).toBe(1490);
    expect(order.subtotalCents).toBe(1490);
    expect(order.status).toBe("PENDING");
    expect(order.items[0]?.unitPriceCents).toBe(1490);
    expect(order.items[0]?.productId).toBe(product.id);

    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.totalCents).toBe(1490);
  });

  it("aplica cupom válido no servidor e registra o resgate", async () => {
    const { user, coupon } = await prepareCart({ coupon: true });
    const { order } = await createOrderFromCart({
      userId: user.id,
      customerName: "Cliente Teste",
      customerEmail: user.email,
      couponCode: coupon?.code,
      checkoutKey: randomUUID(),
    });
    expect(order.discountCents).toBe(149);
    expect(order.totalCents).toBe(1341);
    expect(await prisma.couponRedemption.count({ where: { orderId: order.id } })).toBe(1);
    const updatedCoupon = await prisma.coupon.findUnique({ where: { id: coupon?.id } });
    expect(updatedCoupon?.redemptionCount).toBe(1);
  });

  it("rejeita cupom inexistente sem criar pedido", async () => {
    const { user } = await prepareCart();
    const before = await prisma.order.count({ where: { userId: user.id } });
    await expect(
      createOrderFromCart({
        userId: user.id,
        customerName: "Cliente Teste",
        customerEmail: user.email,
        couponCode: "NAOEXISTE",
        checkoutKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderError);
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(before);
  });

  it("é idempotente para a mesma chave de checkout", async () => {
    const { user } = await prepareCart();
    const checkoutKey = randomUUID();
    const first = await createOrderFromCart({
      userId: user.id,
      customerName: "Cliente Teste",
      customerEmail: user.email,
      checkoutKey,
    });
    const second = await createOrderFromCart({
      userId: user.id,
      customerName: "Cliente Teste",
      customerEmail: user.email,
      checkoutKey,
    });
    expect(second.reused).toBe(true);
    expect(second.order.id).toBe(first.order.id);
    expect(await prisma.order.count({ where: { userId: user.id, checkoutKey } })).toBe(1);
  });

  it("não permite cupom 100% gerar pedido gratuito não autorizado", async () => {
    const user = await createTestUser();
    const { product } = await createTestProduct({ priceCents: 1000 });
    await putProductInCart(user.id, product.id);
    const freeCoupon = await createTestCoupon({ value: 100 });
    await expect(
      createOrderFromCart({
        userId: user.id,
        customerName: "Cliente Teste",
        customerEmail: user.email,
        couponCode: freeCoupon.code,
        checkoutKey: randomUUID(),
      }),
    ).rejects.toThrow("maior que zero");
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  });

  it("impede que o mesmo cliente reutilize o cupom", async () => {
    const { user, coupon } = await prepareCart({ coupon: true });
    await createOrderFromCart({
      userId: user.id,
      customerName: "Cliente Teste",
      customerEmail: user.email,
      couponCode: coupon?.code,
      checkoutKey: randomUUID(),
    });
    const { product: secondProduct } = await createTestProduct({ priceCents: 1000 });
    await putProductInCart(user.id, secondProduct.id);
    await expect(
      createOrderFromCart({
        userId: user.id,
        customerName: "Cliente Teste",
        customerEmail: user.email,
        couponCode: coupon?.code,
        checkoutKey: randomUUID(),
      }),
    ).rejects.toThrow("já utilizou");
  });

  it("garante concorrência segura em cupom com limite global", async () => {
    const coupon = await createTestCoupon({ value: 10, maxRedemptions: 1, perUserLimit: 5 });
    const userA = await createTestUser({ email: `a-${randomUUID()}@example.com` });
    const userB = await createTestUser({ email: `b-${randomUUID()}@example.com` });
    const { product } = await createTestProduct({ priceCents: 2000 });
    await putProductInCart(userA.id, product.id);
    await putProductInCart(userB.id, product.id);

    const results = await Promise.allSettled([
      createOrderFromCart({
        userId: userA.id,
        customerName: "A",
        customerEmail: userA.email,
        couponCode: coupon.code,
        checkoutKey: randomUUID(),
      }),
      createOrderFromCart({
        userId: userB.id,
        customerName: "B",
        customerEmail: userB.email,
        couponCode: coupon.code,
        checkoutKey: randomUUID(),
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(1);
    const updated = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updated.redemptionCount).toBe(1);
  });
});
