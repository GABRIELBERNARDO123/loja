import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { defaultSettingsData } from "@/lib/settings";

const TABLES = [
  "download_logs",
  "download_entitlements",
  "payment_events",
  "payments",
  "coupon_redemptions",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "product_files",
  "products",
  "categories",
  "coupons",
  "verification_tokens",
  "sessions",
  "idempotency_records",
  "audit_logs",
  "rate_limits",
  "users",
  "roles",
  "store_settings",
];

export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  await prisma.role.createMany({
    data: [
      { name: "ADMIN", description: "Administrador" },
      { name: "CUSTOMER", description: "Cliente" },
    ],
  });
  await prisma.storeSettings.create({ data: defaultSettingsData });
}

export async function createTestUser(options: {
  email?: string;
  role?: "ADMIN" | "CUSTOMER";
  name?: string;
} = {}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: options.role ?? "CUSTOMER" } });
  return prisma.user.create({
    data: {
      name: options.name ?? "Usuário Teste",
      email: options.email ?? `user-${randomUUID()}@example.com`,
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$9UVTQ5txHbqHLJF1BR9pOQ$ZYlyRpZTN5zyabYDVrBnCNtiBjg4AzRVvXqCq9joENY",
      roleId: role.id,
      emailVerifiedAt: new Date(),
    },
  });
}

export async function createTestCategory(name = "Categoria Teste") {
  return prisma.category.create({
    data: {
      name,
      slug: `cat-${randomUUID()}`,
      isActive: true,
    },
  });
}

export async function createTestProduct(options: {
  priceCents?: number;
  categoryId?: string | null;
  withFile?: boolean;
  slug?: string;
} = {}) {
  const product = await prisma.product.create({
    data: {
      name: "Produto de Teste",
      slug: options.slug ?? `produto-${randomUUID()}`,
      shortDescription: "Descrição curta do produto de teste para integração.",
      description: "## Descrição\n\nConteúdo de teste do produto digital.",
      priceCents: options.priceCents ?? 1490,
      fileFormat: "PDF",
      categoryId: options.categoryId ?? null,
      isActive: true,
      downloadLimit: 5,
      downloadExpiryDays: 30,
    },
  });

  let file = null;
  if (options.withFile ?? true) {
    file = await prisma.productFile.create({
      data: {
        productId: product.id,
        pathname: `products/${product.id}/test-${randomUUID()}.pdf`,
        originalName: "arquivo-teste.pdf",
        mimeType: "application/pdf",
        sizeBytes: 128,
        sha256: "a".repeat(64),
      },
    });
  }

  return { product, file };
}

export async function putProductInCart(userId: string, productId: string) {
  let cart = await prisma.cart.findFirst({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 1 } });
  return cart;
}

export async function createTestCoupon(options: {
  code?: string;
  type?: "PERCENT" | "FIXED";
  value?: number;
  minSubtotalCents?: number;
  maxDiscountCents?: number | null;
  maxRedemptions?: number | null;
  perUserLimit?: number;
  isActive?: boolean;
  endsAt?: Date | null;
} = {}) {
  return prisma.coupon.create({
    data: {
      code: options.code ?? `CUPOM${Math.floor(Math.random() * 1_000_000)}`,
      type: options.type ?? "PERCENT",
      value: options.value ?? 10,
      minSubtotalCents: options.minSubtotalCents ?? 0,
      maxDiscountCents: options.maxDiscountCents ?? null,
      maxRedemptions: options.maxRedemptions ?? null,
      perUserLimit: options.perUserLimit ?? 1,
      isActive: options.isActive ?? true,
      endsAt: options.endsAt ?? null,
    },
  });
}

export { prisma };
