import { Prisma, type Coupon, type Order, type OrderItem, type Product } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateDiscountCents, normalizeCouponCode, priceCart, validateCouponRules } from "@/lib/coupons";
import { getEnv } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrderError";
    this.status = status;
  }
}

export type CheckoutLine = {
  productId: string;
  name: string;
  slug: string;
  fileFormat: string;
  coverImageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  available: boolean;
};

export type CheckoutPreview = {
  cartId: string | null;
  lines: CheckoutLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  couponDescription: string | null;
  itemCount: number;
};

type CartForCheckout = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

async function getCartForCheckout(userId: string): Promise<CartForCheckout | null> {
  return prisma.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
  });
}

export async function getCheckoutPreview(userId: string, couponCode?: string): Promise<CheckoutPreview> {
  const cart = await getCartForCheckout(userId);
  if (!cart || cart.items.length === 0) {
    throw new OrderError("Seu carrinho está vazio.", 400);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: cart.items.map((item) => item.productId) } },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const lines: CheckoutLine[] = cart.items.flatMap((item) => {
    const product = productMap.get(item.productId);
    if (!product) return [];
    return [
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        fileFormat: product.fileFormat,
        coverImageUrl: product.coverImageUrl,
        unitPriceCents: product.priceCents,
        quantity: 1,
        available: product.isActive,
      },
    ];
  });

  const availableLines = lines.filter((line) => line.available);
  if (availableLines.length === 0) throw new OrderError("Nenhum produto disponível no carrinho.");

  let coupon: Coupon | null = null;
  const normalizedCode = couponCode ? normalizeCouponCode(couponCode) : "";
  if (normalizedCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (!coupon) throw new OrderError("Cupom inválido ou expirado.");
    const redemptions = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    validateCouponRules(coupon, availableLines.reduce((sum, line) => sum + line.unitPriceCents, 0), redemptions);
  }

  const priced = priceCart(
    availableLines.map((line) => ({
      productId: line.productId,
      name: line.name,
      unitPriceCents: line.unitPriceCents,
      quantity: 1,
    })),
    coupon,
    coupon ? await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } }) : 0,
  );

  return {
    cartId: cart.id,
    lines,
    subtotalCents: priced.subtotalCents,
    discountCents: priced.discountCents,
    totalCents: priced.totalCents,
    couponCode: priced.coupon?.code ?? null,
    couponDescription: priced.coupon?.description ?? null,
    itemCount: availableLines.length,
  };
}

function generateOrderCode(): string {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const random = Array.from({ length: 5 })
    .map(() => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)])
    .join("");
  return `VD-${date}-${random}`;
}

export type CreatedOrder = {
  order: Order & { items: OrderItem[] };
  reused: boolean;
};

export async function createOrderFromCart(params: {
  userId: string;
  customerName: string;
  customerEmail: string;
  couponCode?: string;
  checkoutKey: string;
}): Promise<CreatedOrder> {
  if (!params.checkoutKey || params.checkoutKey.length < 12 || params.checkoutKey.length > 100) {
    throw new OrderError("Chave de idempotência inválida.");
  }

  const existing = await prisma.order.findUnique({
    where: { checkoutKey: params.checkoutKey },
    include: { items: true },
  });
  if (existing) {
    if (existing.userId !== params.userId) throw new OrderError("Requisição inválida.", 409);
    return { order: existing, reused: true };
  }

  const env = getEnv();
  if (env.REQUIRE_EMAIL_VERIFICATION) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user?.emailVerifiedAt) {
      throw new OrderError("Confirme seu e-mail antes de finalizar a compra.", 403);
    }
  }

  const settings = await getStoreSettings();
  const normalizedCoupon = params.couponCode ? normalizeCouponCode(params.couponCode) : "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const cart = await tx.cart.findFirst({
            where: { userId: params.userId },
            orderBy: { updatedAt: "desc" },
            include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
          });
          if (!cart || cart.items.length === 0) throw new OrderError("Seu carrinho está vazio.");

          const productIds = cart.items.map((item) => item.productId);
          const products = await tx.product.findMany({ where: { id: { in: productIds } } });
          const productMap = new Map(products.map((product) => [product.id, product]));

          const usable: Array<{ product: Product; quantity: number }> = [];
          for (const item of cart.items) {
            const product = productMap.get(item.productId);
            if (!product || !product.isActive) {
              throw new OrderError("Um produto do carrinho não está mais disponível. Revise o carrinho.");
            }
            usable.push({ product, quantity: 1 });
          }

          const subtotal = usable.reduce((sum, entry) => sum + entry.product.priceCents, 0);
          if (subtotal <= 0) throw new OrderError("Valor do pedido inválido.");

          let coupon: Coupon | null = null;
          let discountCents = 0;
          if (normalizedCoupon) {
            coupon = await tx.coupon.findUnique({ where: { code: normalizedCoupon } });
            if (!coupon) throw new OrderError("Cupom inválido ou expirado.");
            const userRedemptions = await tx.couponRedemption.count({
              where: { couponId: coupon.id, userId: params.userId },
            });
            validateCouponRules(coupon, subtotal, userRedemptions);
            discountCents = calculateDiscountCents(coupon, subtotal);

            if (coupon.maxRedemptions !== null) {
              const updated = await tx.coupon.updateMany({
                where: {
                  id: coupon.id,
                  isActive: true,
                  redemptionCount: { lt: coupon.maxRedemptions },
                },
                data: { redemptionCount: { increment: 1 } },
              });
              if (updated.count !== 1) throw new OrderError("Cupom inválido ou expirado.");
            } else {
              await tx.coupon.update({
                where: { id: coupon.id },
                data: { redemptionCount: { increment: 1 } },
              });
            }
          }

          const total = subtotal - discountCents;
          if (total <= 0) throw new OrderError("O valor final do pedido deve ser maior que zero.");

          const order = await tx.order.create({
            data: {
              code: generateOrderCode(),
              userId: params.userId,
              customerName: params.customerName.trim().slice(0, 120),
              customerEmail: params.customerEmail.trim().toLowerCase().slice(0, 160),
              subtotalCents: subtotal,
              discountCents,
              totalCents: total,
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              checkoutKey: params.checkoutKey,
              expiresAt: new Date(Date.now() + settings.pixExpirationMinutes * 60 * 1000),
              items: {
                create: usable.map((entry) => ({
                  productId: entry.product.id,
                  productName: entry.product.name,
                  productSlug: entry.product.slug,
                  fileFormat: entry.product.fileFormat,
                  unitPriceCents: entry.product.priceCents,
                  quantity: 1,
                  totalCents: entry.product.priceCents,
                  downloadLimit: entry.product.downloadLimit,
                  expiryDays: entry.product.downloadExpiryDays,
                })),
              },
            },
            include: { items: true },
          });

          if (coupon) {
            await tx.couponRedemption.create({
              data: { couponId: coupon.id, userId: params.userId, orderId: order.id },
            });
          }

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          return { order, reused: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
      );
    } catch (error) {
      if (error instanceof OrderError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034") continue;
        if (error.code === "P2002" && error.meta?.target) {
          const existingOrder = await prisma.order.findUnique({
            where: { checkoutKey: params.checkoutKey },
            include: { items: true },
          });
          if (existingOrder && existingOrder.userId === params.userId) {
            return { order: existingOrder, reused: true };
          }
          throw new OrderError("Não foi possível criar o pedido. Tente novamente.", 409);
        }
      }
      throw error;
    }
  }

  throw new OrderError("O sistema está ocupado. Tente novamente em instantes.", 503);
}

export async function getOrderForUser(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}
