import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { ChevronLeft } from "@/components/icons";
import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getStoreSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/produtos" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
          <ChevronLeft /> Voltar para produtos
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Novo produto</h1>
        <p className="mt-1 text-sm text-zinc-500">Cadastre as informações comerciais. Após criar, envie os arquivos digitais na página de edição.</p>
      </div>
      <ProductForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        initial={undefined}
      />
      <p className="text-[11px] text-zinc-600">
        Política padrão da loja: {settings.defaultDownloadLimit} downloads em até {settings.defaultExpiryDays} dias.
        O upload é feito na etapa seguinte.
      </p>
    </div>
  );
}
