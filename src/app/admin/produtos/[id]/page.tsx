import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFiles } from "@/components/admin/product-files";
import { ChevronLeft, ExternalIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { centsToInput } from "@/lib/format";

export const metadata: Metadata = { title: "Editar produto" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        files: { orderBy: { createdAt: "desc" } },
        category: true,
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/produtos" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
            <ChevronLeft /> Voltar para produtos
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {product._count.orderItems} venda(s) registrada(s) · {product.files.length} arquivo(s) no storage privado
          </p>
        </div>
        <Link href={`/produto/${product.slug}`} target="_blank" className="btn-secondary btn-sm">
          <ExternalIcon /> Ver na loja
        </Link>
      </div>

      <ProductForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          price: centsToInput(product.priceCents),
          compareAt: product.compareAtCents ? centsToInput(product.compareAtCents) : "",
          categoryId: product.categoryId ?? "",
          coverImageUrl: product.coverImageUrl ?? "",
          previewUrl: product.previewUrl ?? "",
          fileFormat: product.fileFormat,
          compatibility: product.compatibility ?? "",
          sortOrder: product.sortOrder,
          downloadLimit: product.downloadLimit,
          downloadExpiryDays: product.downloadExpiryDays,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        }}
      />

      <ProductFiles
        productId={product.id}
        files={product.files.map((file) => ({
          id: file.id,
          originalName: file.originalName,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          sha256: file.sha256,
          createdAt: file.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
