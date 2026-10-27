import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/env";
import { getProductSlugs, listCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicAppUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/produtos`, changeFrequency: "daily", priority: 0.9 },
    ...["termos", "privacidade", "reembolso", "licenca", "contato"].map((slug) => ({
      url: `${base}/paginas/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  try {
    const [products, categories] = await Promise.all([getProductSlugs(), listCategories()]);
    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${base}/produtos?categoria=${encodeURIComponent(category.slug)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...products.map((product) => ({
        url: `${base}/produto/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
