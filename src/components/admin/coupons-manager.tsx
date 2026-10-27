"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionButton } from "@/components/admin/action-button";
import { EditIcon, PlusIcon, TagIcon } from "@/components/icons";
import { formatBRL } from "@/lib/format";

type CouponItem = {
  id: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number;
  isActive: boolean;
};

const EMPTY = {
  code: "",
  description: "",
  type: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  perUserLimit: 1,
  isActive: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function CouponsManager({ coupons }: { coupons: CouponItem[] }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function startEdit(coupon: CouponItem) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.type === "PERCENT" ? String(coupon.value) : (coupon.value / 100).toFixed(2).replace(".", ","),
      minSubtotal: coupon.minSubtotalCents ? (coupon.minSubtotalCents / 100).toFixed(2).replace(".", ",") : "",
      maxDiscount: coupon.maxDiscountCents ? (coupon.maxDiscountCents / 100).toFixed(2).replace(".", ",") : "",
      startsAt: toLocalInput(coupon.startsAt),
      endsAt: toLocalInput(coupon.endsAt),
      maxRedemptions: coupon.maxRedemptions ? String(coupon.maxRedemptions) : "",
      perUserLimit: coupon.perUserLimit,
      isActive: coupon.isActive,
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
      const response = await fetch(editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string[]> };
      if (!response.ok || !data.ok) {
        throw new Error((data.fields ? Object.values(data.fields).flat()[0] : undefined) ?? data.error ?? "Erro ao salvar cupom.");
      }
      toast.success(editingId ? "Cupom atualizado." : "Cupom criado.");
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar cupom.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
        <h2 className="mb-4 font-display text-base font-semibold text-white">{editingId ? "Editar cupom" : "Novo cupom"}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-code" className="label">Código</label>
              <input
                id="coupon-code"
                required
                maxLength={40}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                className="input uppercase"
                placeholder="BEMVINDO10"
              />
            </div>
            <div>
              <label htmlFor="coupon-type" className="label">Tipo</label>
              <select
                id="coupon-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as "PERCENT" | "FIXED" })}
                className="input"
              >
                <option value="PERCENT">Percentual</option>
                <option value="FIXED">Valor fixo</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="coupon-value" className="label">{form.type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}</label>
            <input
              id="coupon-value"
              required
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
              className="input"
              placeholder={form.type === "PERCENT" ? "10" : "5,00"}
            />
          </div>
          <div>
            <label htmlFor="coupon-description" className="label">Descrição interna</label>
            <input
              id="coupon-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input"
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-min" className="label">Compra mínima</label>
              <input
                id="coupon-min"
                value={form.minSubtotal}
                onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
                className="input"
                placeholder="0,00"
              />
            </div>
            <div>
              <label htmlFor="coupon-max-discount" className="label">Desconto máximo</label>
              <input
                id="coupon-max-discount"
                value={form.maxDiscount}
                onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
                className="input"
                placeholder="opcional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-start" className="label">Início</label>
              <input
                id="coupon-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label htmlFor="coupon-end" className="label">Fim</label>
              <input
                id="coupon-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                className="input text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-max-uses" className="label">Máx. de usos</label>
              <input
                id="coupon-max-uses"
                value={form.maxRedemptions}
                onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })}
                className="input"
                placeholder="ilimitado"
              />
            </div>
            <div>
              <label htmlFor="coupon-per-user" className="label">Por cliente</label>
              <input
                id="coupon-per-user"
                type="number"
                min={1}
                max={100}
                value={form.perUserLimit}
                onChange={(event) => setForm({ ...form, perUserLimit: Number(event.target.value) })}
                className="input"
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">
            Cupom ativo
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 accent-[color:var(--brand)]"
            />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {editingId ? <EditIcon /> : <PlusIcon />}
            {loading ? "Salvando..." : editingId ? "Salvar" : "Criar cupom"}
          </button>
          {editingId && <button type="button" onClick={reset} className="btn-ghost">Cancelar</button>}
        </div>
      </form>

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-wine-500/10 text-wine-300"><TagIcon /></span>
                <div>
                  <p className="font-display text-base font-bold tracking-wide text-white">{coupon.code}</p>
                  <p className="text-[11px] text-zinc-500">
                    {coupon.type === "PERCENT" ? `${coupon.value}% de desconto` : `${formatBRL(coupon.value)} de desconto`}
                    {coupon.minSubtotalCents > 0 ? ` · mínimo ${formatBRL(coupon.minSubtotalCents)}` : ""}
                  </p>
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${coupon.isActive ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"}`}>
                {coupon.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3 text-[10px] text-zinc-500 sm:grid-cols-4">
              <span>Usos: {coupon.redemptionCount}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ""}</span>
              <span>Por cliente: {coupon.perUserLimit}</span>
              <span>{coupon.startsAt ? `De ${new Date(coupon.startsAt).toLocaleDateString("pt-BR")}` : "Sem data inicial"}</span>
              <span>{coupon.endsAt ? `Até ${new Date(coupon.endsAt).toLocaleDateString("pt-BR")}` : "Sem validade"}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => startEdit(coupon)} className="btn-ghost btn-sm"><EditIcon /> Editar</button>
              <ActionButton
                url={`/api/admin/coupons/${coupon.id}`}
                method="PATCH"
                body={{ isActive: !coupon.isActive }}
                className="btn-secondary btn-sm"
              >
                {coupon.isActive ? "Desativar" : "Ativar"}
              </ActionButton>
            </div>
          </div>
        ))}
        {coupons.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-zinc-500">
            Nenhum cupom cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
