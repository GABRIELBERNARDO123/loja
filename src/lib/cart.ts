import { cookies } from "next/headers";
import type { Cart, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { isProduction } from "@/lib/env";

export const CART_COOKIE = "loja_cart";
const CART_TTL_SECONDS = 30 * 24 * 60 * 60;

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: { include: { category: true } };
      };
    };
  };
}>;

function cartCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getGuestCartByCookie(): Promise<CartWithItems | null> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return null;
  return prisma.cart.findUnique({
    where: { guestTokenHash: sha256(raw) },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getUserCart(userId: string): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getReadableCart(userId: string | null): Promise<CartWithItems | null> {
  if (userId) return getUserCart(userId);
  return getGuestCartByCookie();
}

async function createCartForUser(userId: string): Promise<Cart> {
  return prisma.cart.create({ data: { userId } });
}

async function createGuestCart(): Promise<Cart> {
  const rawToken = randomToken(32);
  const cart = await prisma.cart.create({
    data: { guestTokenHash: sha256(rawToken) },
  });
  const store = await cookies();
  store.set(CART_COOKIE, rawToken, cartCookieOptions(CART_TTL_SECONDS));
  return cart;
}

export async function getOrCreateCart(userId: string | null): Promise<Cart> {
  if (userId) {
    const existing = await prisma.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return existing ?? createCartForUser(userId);
  }
  const existing = await getGuestCartByCookie();
  return existing ?? createGuestCart();
}

export async function addProductToCart(userId: string | null, productId: string): Promise<{ count: number }> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });
  if (!product) throw new Error("Produto indisponível.");

  const cart = await getOrCreateCart(userId);

  await prisma.$transaction([
    prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity: 1 },
      update: { quantity: 1 },
    }),
    prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } }),
  ]);

  const count = await prisma.cartItem.count({ where: { cartId: cart.id } });
  return { count };
}

export async function removeCartItem(userId: string | null, productId: string): Promise<void> {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const guestCart = await getGuestCartByCookie();
  const store = await cookies();
  if (!guestCart) {
    store.set(CART_COOKIE, "", { ...cartCookieOptions(0), maxAge: 0 });
    return;
  }

  const userCart = (await prisma.cart.findFirst({ where: { userId } })) ?? (await createCartForUser(userId));
  const guestProductIds = guestCart.items.map((item) => item.productId);

  await prisma.$transaction(async (tx) => {
    if (guestProductIds.length > 0) {
      await tx.cartItem.createMany({
        data: guestProductIds.map((productId) => ({
          cartId: userCart.id,
          productId,
          quantity: 1,
        })),
        skipDuplicates: true,
      });
    }
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  store.set(CART_COOKIE, "", { ...cartCookieOptions(0), maxAge: 0 });
}

export async function countCartItems(userId: string | null): Promise<number> {
  const cart = await getReadableCart(userId);
  return cart?.items.length ?? 0;
}

export type CartSummaryLine = {
  productId: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  fileFormat: string;
  unitPriceCents: number;
  quantity: number;
  available: boolean;
};

export type CartSummary = {
  id: string | null;
  lines: CartSummaryLine[];
  subtotalCents: number;
  itemCount: number;
};

export async function getCartSummary(userId: string | null): Promise<CartSummary> {
  const cart = await getReadableCart(userId);
  if (!cart) {
    return { id: null, lines: [], subtotalCents: 0, itemCount: 0 };
  }
  const lines: CartSummaryLine[] = cart.items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    slug: item.product.slug,
    coverImageUrl: item.product.coverImageUrl,
    fileFormat: item.product.fileFormat,
    unitPriceCents: item.product.priceCents,
    quantity: 1,
    available: item.product.isActive,
  }));
  return {
    id: cart.id,
    lines,
    subtotalCents: lines.filter((line) => line.available).reduce((sum, line) => sum + line.unitPriceCents, 0),
    itemCount: lines.length,
  };
}
