"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockIcon, MailIcon, TagIcon, UserIcon } from "@/components/icons";

export function CheckoutForm({
  defaultName,
  defaultEmail,
  couponCode,
  paymentsReady,
  emailVerified,
}: {
  defaultName: string;
  defaultEmail: string;
  couponCode: string;
  paymentsReady: boolean;
  emailVerified: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [coupon, setCoupon] = useState(couponCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function applyCoupon() {
    const value = coupon.trim().toUpperCase();
    router.push(value ? `/checkout?cupom=${encodeURIComponent(value)}` : "/checkout");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentsReady) {
      setError("Pagamento indisponível. A integração Pix precisa ser configurada pelo administrador.");
      return;
    }
    if (!emailVerified) {
      setError("Confirme seu e-mail antes de finalizar a compra.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          couponCode: coupon.trim(),
          idempotencyKey,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        fields?: Record<string, string[]>;
      };
      if (!response.ok || !data.ok || !data.orderId) {
        const fieldMessage = data.fields ? Object.values(data.fields).flat()[0] : undefined;
        throw new Error(fieldMessage ?? data.error ?? "Não foi possível gerar o pagamento.");
      }
      toast.success("Pix gerado. Aguardando confirmação.");
      router.push(`/pedido/${data.orderId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar compra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-ink-850/50 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-white">Dados do comprador</h2>
        <p className="mt-1 text-xs text-zinc-500">Usaremos estes dados para identificar o pedido e emitir o acesso.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="checkout-name" className="label">Nome completo</label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="checkout-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input pl-11"
              autoComplete="name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="checkout-email" className="label">E-mail</label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="checkout-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input pl-11"
              autoComplete="email"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="checkout-coupon" className="label">Cupom de desconto (opcional)</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TagIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="checkout-coupon"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              className="input pl-11 uppercase"
              placeholder="CÓDIGO"
              maxLength={40}
            />
          </div>
          <button type="button" onClick={applyCoupon} className="btn-secondary px-4">Aplicar</button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><LockIcon /></span>
          <div>
            <p className="text-sm font-semibold text-white">Pagamento via Pix</p>
            <p className="text-[11px] text-zinc-500">QR Code e código copia e cola gerados com segurança</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-500">
          O valor total é calculado no servidor a partir dos preços oficiais. A confirmação é validada diretamente com
          o provedor de pagamentos antes de liberar os arquivos.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}

      <button
        type="submit"
        disabled={loading || !paymentsReady || !emailVerified}
        className="btn-primary w-full py-4 text-base"
      >
        {loading ? "Gerando Pix..." : "Gerar Pix e finalizar"}
      </button>
      <p className="text-center text-[11px] leading-5 text-zinc-600">
        Ao gerar o Pix, você confirma que os dados estão corretos. O pedido só será liberado após a confirmação
        efetiva do pagamento.
      </p>
    </form>
  );
}
