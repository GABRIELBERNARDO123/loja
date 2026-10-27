"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionButton } from "@/components/admin/action-button";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

const EMPTY = { name: "", slug: "", description: "", sortOrder: 0, isActive: true };

export function CategoriesManager({ categories }: { categories: CategoryItem[] }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function startEdit(category: CategoryItem) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string[]> };
      if (!response.ok || !data.ok) {
        throw new Error((data.fields ? Object.values(data.fields).flat()[0] : undefined) ?? data.error ?? "Erro ao salvar categoria.");
      }
      toast.success(editingId ? "Categoria atualizada." : "Categoria criada.");
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar categoria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
        <h2 className="mb-4 font-display text-base font-semibold text-white">
          {editingId ? "Editar categoria" : "Nova categoria"}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="category-name" className="label">Nome</label>
            <input
              id="category-name"
              required
              minLength={2}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="input"
              placeholder="Planilhas"
            />
          </div>
          <div>
            <label htmlFor="category-slug" className="label">Slug</label>
            <input
              id="category-slug"
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              className="input"
              placeholder="gerado pelo nome"
            />
          </div>
          <div>
            <label htmlFor="category-description" className="label">Descrição</label>
            <textarea
              id="category-description"
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input resize-none"
              maxLength={300}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="category-order" className="label">Ordem</label>
              <input
                id="category-order"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                className="input"
              />
            </div>
            <label className="mt-6 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-zinc-300">
              Ativa
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 accent-[color:var(--brand)]"
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {editingId ? <EditIcon /> : <PlusIcon />}
            {loading ? "Salvando..." : editingId ? "Salvar" : "Criar categoria"}
          </button>
          {editingId && <button type="button" onClick={reset} className="btn-ghost">Cancelar</button>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-white">Categorias cadastradas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Produtos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-200">{category.name}</p>
                    <p className="text-[10px] text-zinc-600">/{category.slug} · ordem {category.sortOrder}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{category.productCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${category.isActive ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"}`}>
                      {category.isActive ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => startEdit(category)} className="btn-ghost btn-sm"><EditIcon /> Editar</button>
                      <ActionButton
                        url={`/api/admin/categories/${category.id}`}
                        method="PATCH"
                        body={{ isActive: !category.isActive }}
                        className="btn-secondary btn-sm"
                      >
                        {category.isActive ? "Desativar" : "Ativar"}
                      </ActionButton>
                      <ActionButton
                        url={`/api/admin/categories/${category.id}`}
                        method="DELETE"
                        confirmMessage={`Excluir a categoria "${category.name}"?`}
                        className="btn-danger btn-sm"
                      >
                        <TrashIcon />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-500">Nenhuma categoria cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
