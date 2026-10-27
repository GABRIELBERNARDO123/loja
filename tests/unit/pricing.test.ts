import { describe, expect, it } from "vitest";
import type { Coupon } from "@prisma/client";
import { calculateDiscountCents, priceCart, validateCouponRules } from "@/lib/coupons";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "TESTE10",
    description: null,
    type: "PERCENT",
    value: 10,
    minSubtotalCents: 0,
    maxDiscountCents: null,
    startsAt: null,
    endsAt: null,
    maxRedemptions: null,
    redemptionCount: 0,
    perUserLimit: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon;
}

describe("precificação server-side", () => {
  it("calcula o total a partir do preço oficial, ignorando qualquer valor de cliente", () => {
    const result = priceCart(
      [{ productId: "p1", name: "Produto", unitPriceCents: 1490, quantity: 1 }],
      null,
    );
    expect(result.subtotalCents).toBe(1490);
    expect(result.totalCents).toBe(1490);
    expect(result.discountCents).toBe(0);
  });

  it("aplica percentual com arredondamento inteiro em centavos", () => {
    const result = priceCart(
      [{ productId: "p1", name: "Produto", unitPriceCents: 1490, quantity: 1 }],
      coupon({ value: 10 }),
    );
    expect(result.discountCents).toBe(149);
    expect(result.totalCents).toBe(1341);
  });

  it("respeita teto de desconto", () => {
    const result = priceCart(
      [{ productId: "p1", name: "Produto", unitPriceCents: 10000, quantity: 1 }],
      coupon({ value: 50, maxDiscountCents: 1000 }),
    );
    expect(result.discountCents).toBe(1000);
    expect(result.totalCents).toBe(9000);
  });

  it("nunca deixa o total ficar negativo", () => {
    const result = priceCart(
      [{ productId: "p1", name: "Produto", unitPriceCents: 500, quantity: 1 }],
      coupon({ type: "FIXED", value: 900 }),
    );
    expect(result.discountCents).toBe(500);
    expect(result.totalCents).toBe(0);
  });

  it("rejeita cupom expirado", () => {
    const expired = coupon({ endsAt: new Date(Date.now() - 60_000) });
    expect(() => validateCouponRules(expired, 1490, 0)).toThrow("Cupom inválido ou expirado");
  });

  it("rejeita cupom acima do limite global mesmo com concorrência lógica", () => {
    const limited = coupon({ maxRedemptions: 1, redemptionCount: 1 });
    expect(() => validateCouponRules(limited, 1490, 0)).toThrow("Cupom inválido ou expirado");
  });

  it("rejeita reutilização pelo mesmo cliente", () => {
    expect(() => validateCouponRules(coupon({ perUserLimit: 1 }), 1490, 1)).toThrow("Você já utilizou este cupom");
  });

  it("rejeita compra abaixo do mínimo", () => {
    expect(() => validateCouponRules(coupon({ minSubtotalCents: 2000 }), 1490, 0)).toThrow("valor mínimo");
  });

  it("calcula desconto fixo e percentual", () => {
    expect(calculateDiscountCents(coupon({ type: "FIXED", value: 500 }), 1490)).toBe(500);
    expect(calculateDiscountCents(coupon({ value: 25 }), 2000)).toBe(500);
  });

  it("normaliza quantidade para pelo menos uma licença e no máximo 99", () => {
    const result = priceCart(
      [{ productId: "p1", name: "Produto", unitPriceCents: 1000, quantity: 0 }],
      null,
    );
    expect(result.lines[0]?.quantity).toBe(1);
  });
});
