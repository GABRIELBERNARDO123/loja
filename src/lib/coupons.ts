import type { Coupon } from "@prisma/client";

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

export function validateCouponRules(
  coupon: Coupon | null,
  subtotalCents: number,
  userRedemptions: number,
  now = new Date(),
): Coupon | null {
  if (!coupon) return null;
  if (!coupon.isActive) throw new CouponError("Cupom inválido ou expirado.");
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    throw new CouponError("Cupom inválido ou expirado.");
  }
  if (coupon.endsAt && coupon.endsAt.getTime() <= now.getTime()) {
    throw new CouponError("Cupom inválido ou expirado.");
  }
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new CouponError("Cupom inválido ou expirado.");
  }
  if (userRedemptions >= coupon.perUserLimit) {
    throw new CouponError("Você já utilizou este cupom.");
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    throw new CouponError("O valor mínimo para este cupom não foi atingido.");
  }
  return coupon;
}

export function calculateDiscountCents(coupon: Coupon, subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  let discount = 0;
  if (coupon.type === "PERCENT") {
    const percent = Math.min(Math.max(coupon.value, 0), 100);
    discount = Math.floor((subtotalCents * percent) / 100);
  } else {
    discount = Math.max(coupon.value, 0);
  }
  if (coupon.maxDiscountCents !== null) {
    discount = Math.min(discount, coupon.maxDiscountCents);
  }
  return Math.min(discount, subtotalCents);
}

export type PriceLine = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type PricedCart = {
  lines: PriceLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  coupon: Coupon | null;
};

export function priceCart(lines: PriceLine[], coupon: Coupon | null, userRedemptions = 0, now = new Date()): PricedCart {
  const safeLines = lines.map((line) => ({
    ...line,
    quantity: Math.max(1, Math.min(Math.trunc(line.quantity), 99)),
    unitPriceCents: Math.max(0, Math.trunc(line.unitPriceCents)),
  }));
  const subtotalCents = safeLines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const validCoupon = coupon ? validateCouponRules(coupon, subtotalCents, userRedemptions, now) : null;
  const discountCents = validCoupon ? calculateDiscountCents(validCoupon, subtotalCents) : 0;
  return {
    lines: safeLines,
    subtotalCents,
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
    coupon: validCoupon,
  };
}
