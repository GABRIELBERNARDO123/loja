"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "@/components/icons";

type CategoryOption = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAt: string;
  categoryId: string;
  coverImageUrl: string;
  previewUrl: string;
  fileFormat: string;
  compatibility: string;
  sortOrder: number;
  downloadLimit: number;
  downloadExpiryDays: number;
  isActive: boolean;
  isFeatured: boolean;
};

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAt: "",
  categoryId: "",
  coverImageUrl: "",
  previewUrl: "",
  fileFormat: "PDF",
  compatibility: "",
  sortOrder: 0,
  downloadLimit: 10,
  downloadExpiryDays: 365,
  isActive: true,
  isFeatured: false,
};

export function ProductForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: ProductFormValues;
}) {
  const [form, setForm] = useState<ProductFormValues>(initial ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/admin/upload-image", { method: "POST", body: data });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) throw new Error(payload.error ?? "Falha no upload.");
      update("coverImageUrl", payload.url);
      toast.success("Imagem enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = initial?.id ? `/api/admin/products/${initial.id}` : "/api/admin/products";
      const response = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        productId?: string;
        fields?: Record<string, string[]>;
      };
      if (!response.ok || !data.ok) {
        const fieldMessage = data.fields ? Object.values(data.fields).flat()[0] : undefined;
        throw new Error(fieldMessage ?? data.error ?? "Não foi possível salvar o produto.");
      }
      toast.success(initial?.id ? "Produto atualizado." : "Produto criado.");
      if (!initial?.id && data.productId) {
        router.push(`/admin/produtos/${data.productId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.5fr_0.7fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Informações principais</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-name" className="label">Nome do produto</label>
              <input
                id="product-name"
                required
                minLength={3}
                maxLength={140}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className="input"
                placeholder="Ex.: Planilha de Controle Financeiro"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="product-slug" className="label">Slug (URL)</label>
                <input
                  id="product-slug"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                  className="input"
                  placeholder="gerado pelo nome"
                />
              </div>
              <div>
                <label htmlFor="product-format" className="label">Formato exibido</label>
                <input
                  id="product-format"
                  required
                  maxLength={40}
                  value={form.fileFormat}
                  onChange={(event) => update("fileFormat", event.target.value)}
                  className="input"
                  placeholder="XLSX + PDF"
                />
              </div>
            </div>
            <div>
              <label htmlFor="product-short" className="label">Descrição curta</label>
              <input
                id="product-short"
                required
                minLength={10}
                maxLength={260}
                value={form.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
                className="input"
                placeholder="Resumo objetivo exibido nos cards e na busca."
              />
            </div>
            <div>
              <label htmlFor="product-description" className="label">Descrição completa (Markdown)</label>
              <textarea
                id="product-description"
                required
                minLength={20}
                maxLength={30000}
                rows={12}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="input resize-y font-mono text-[13px] leading-6"
                placeholder={"## O que está incluído\n\n- ...\n\n## Compatibilidade\n\n- ..."}
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">Aceita Markdown. HTML não é renderizado.</p>
            </div>
            <div>
              <label htmlFor="product-compatibility" className="label">Compatibilidade</label>
              <input
                id="product-compatibility"
                maxLength={300}
                value={form.compatibility}
                onChange={(event) => update("compatibility", event.target.value)}
                className="input"
                placeholder="Excel 2016+, Google Sheets, LibreOffice..."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Imagens e prévia</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-cover" className="label">URL da imagem de capa</label>
              <div className="flex gap-2">
                <input
                  id="product-cover"
                  value={form.coverImageUrl}
                  onChange={(event) => update("coverImageUrl", event.target.value)}
                  className="input"
                  placeholder="https://... ou envie uma imagem"
                />
                <label className={`btn-secondary btn-sm cursor-pointer ${uploading ? "opacity-50" : ""}`}>
                  <UploadIcon /> {uploading ? "..." : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {form.coverImageUrl && (
              <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                <img src={form.coverImageUrl} alt="Prévia da capa" className="max-h-48 w-full object-cover" />
              </div>
            )}
            <div>
              <label htmlFor="product-preview" className="label">URL de prévia demonstrativa (opcional)</label>
              <input
                id="product-preview"
                value={form.previewUrl}
                onChange={(event) => update("previewUrl", event.target.value)}
                className="input"
                placeholder="https://..."
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Nunca use o arquivo original. A prévia deve ser pública e separada do produto vendido.
              </p>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Publicação</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-category" className="label">Categoria</label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                className="input"
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">
              Produto ativo
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update("isActive", event.target.checked)}
                className="h-4 w-4 accent-[color:var(--brand)]"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">
              Destacar na home
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => update("isFeatured", event.target.checked)}
                className="h-4 w-4 accent-[color:var(--brand)]"
              />
            </label>
            <div>
              <label htmlFor="product-order" className="label">Ordem de exibição</label>
              <input
                id="product-order"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(event) => update("sortOrder", Number(event.target.value))}
                className="input"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Preço</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-price" className="label">Preço atual (R$)</label>
              <input
                id="product-price"
                required
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                className="input"
                placeholder="14,90"
                inputMode="decimal"
              />
            </div>
            <div>
              <label htmlFor="product-compare" className="label">Preço comparativo (opcional)</label>
              <input
                id="product-compare"
                value={form.compareAt}
                onChange={(event) => update("compareAt", event.target.value)}
                className="input"
                placeholder="29,90"
                inputMode="decimal"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Política de download</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-download-limit" className="label">Limite de downloads</label>
              <input
                id="product-download-limit"
                type="number"
                min={1}
                max={1000}
                value={form.downloadLimit}
                onChange={(event) => update("downloadLimit", Number(event.target.value))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="product-expiry" className="label">Prazo de acesso (dias)</label>
              <input
                id="product-expiry"
                type="number"
                min={1}
                max={3650}
                value={form.downloadExpiryDays}
                onChange={(event) => update("downloadExpiryDays", Number(event.target.value))}
                className="input"
              />
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? "Salvando..." : initial?.id ? "Salvar alterações" : "Criar produto"}
        </button>
      </aside>
    </form>
  );
}
