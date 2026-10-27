import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Organização</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Categorias</h1>
        <p className="mt-1 text-sm text-zinc-500">Agrupe produtos para melhorar a navegação e a busca da loja.</p>
      </div>
      <CategoriesManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          productCount: category._count.products,
        }))}
      />
    </div>
  );
}
