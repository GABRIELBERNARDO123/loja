import type { Metadata } from "next";
import { CouponsManager } from "@/components/admin/coupons-manager";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Cupons" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Promoções</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Cupons de desconto</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Regras validadas no servidor. O valor final nunca é aceito do navegador.
        </p>
      </div>
      <CouponsManager
        coupons={coupons.map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          description: coupon.description ?? "",
          type: coupon.type,
          value: coupon.value,
          minSubtotalCents: coupon.minSubtotalCents,
          maxDiscountCents: coupon.maxDiscountCents,
          startsAt: coupon.startsAt?.toISOString() ?? null,
          endsAt: coupon.endsAt?.toISOString() ?? null,
          maxRedemptions: coupon.maxRedemptions,
          redemptionCount: coupon.redemptionCount,
          perUserLimit: coupon.perUserLimit,
          isActive: coupon.isActive,
        }))}
      />
    </div>
  );
}
