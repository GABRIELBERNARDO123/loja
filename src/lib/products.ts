import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ProductSort = "relevance" | "price_asc" | "price_desc" | "newest";

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listProducts(params: {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(48, Math.max(1, params.perPage ?? 12));
  const q = params.q?.trim().slice(0, 100) ?? "";

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(params.category ? { category: { slug: params.category, isActive: true } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { shortDescription: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { fileFormat: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    params.sort === "price_asc"
      ? [{ priceCents: "asc" }, { name: "asc" }]
      : params.sort === "price_desc"
        ? [{ priceCents: "desc" }, { name: "asc" }]
        : params.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }];

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      files: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
    },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string | null) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: productId },
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    take: 3,
  });
}

export async function getHomeData() {
  const [featured, latest, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 6,
    }),
  ]);

  return { featured: featured.length > 0 ? featured : latest, latest, categories };
}

export async function getProductSlugs() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
}
