"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { ClockIcon, ExternalIcon, QrCodeIcon, RefreshIcon, ShieldIcon } from "@/components/icons";

export function PaymentPanel({
  orderId,
  initialStatus,
  qrCode,
  qrCodeBase64,
  ticketUrl,
  expiresAt,
}: {
  orderId: string;
  initialStatus: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [now, setNow] = useState(() => Date.now());
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();
  const refreshed = useRef(false);

  const remainingMs = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  const countdown = useMemo(() => {
    if (remainingMs === null) return null;
    if (remainingMs <= 0) return "Expirado";
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingMs]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { ok?: boolean; status?: string };
        if (data.ok && data.status && data.status !== "PENDING") {
          setStatus(data.status);
          clearInterval(timer);
          if (!refreshed.current) {
            refreshed.current = true;
            if (data.status === "PAID") toast.success("Pagamento confirmado! Seus downloads foram liberados.");
            else toast.info("O status do pedido foi atualizado.");
            router.refresh();
          }
        }
      } catch {
        // Polling failures are retried silently.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [orderId, router, status]);

  async function retry() {
    setRetrying(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Não foi possível gerar nova cobrança.");
      toast.success("Nova cobrança gerada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar nova cobrança.");
    } finally {
      setRetrying(false);
    }
  }

  if (status === "PAID") return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-850/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <QrCodeIcon className="text-brand" /> Pague com Pix
        </h2>
        {countdown && status === "PENDING" && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${expired ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
            <ClockIcon /> {expired ? "Expirado" : countdown}
          </span>
        )}
      </div>

      {status === "PENDING" ? (
        <>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Escaneie o QR Code ou use o Pix copia e cola. A confirmação é automática; esta página será atualizada.
          </p>

          {qrCodeBase64 && !expired ? (
            <div className="mt-5 flex justify-center">
              <div className="rounded-2xl bg-white p-3 shadow-glow">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code Pix para pagamento"
                  className="h-52 w-52"
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-zinc-500">
              {expired ? "Este Pix expirou. Gere uma nova cobrança abaixo." : "QR Code indisponível. Utilize o código copia e cola."}
            </div>
          )}

          {qrCode && !expired && (
            <div className="mt-4">
              <label className="label">Pix copia e cola</label>
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <p className="max-h-24 overflow-y-auto break-all font-mono text-[10px] leading-5 text-zinc-400">{qrCode}</p>
              </div>
              <CopyButton value={qrCode} label="Copiar código Pix" className="btn-primary btn-sm mt-3 w-full" />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {ticketUrl && !expired && (
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm flex-1">
                <ExternalIcon /> Abrir comprovante
              </a>
            )}
            {(expired || !qrCode) && (
              <button type="button" onClick={retry} disabled={retrying} className="btn-secondary btn-sm flex-1">
                <RefreshIcon /> {retrying ? "Gerando..." : "Gerar novo Pix"}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-zinc-400">
          Este pagamento não está pendente. Status: <strong className="text-zinc-200">{status}</strong>.
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-zinc-600">
        <ShieldIcon className="mt-0.5 shrink-0 text-emerald-500" />
        Nunca compartilhe este código com terceiros. A liberação só ocorre após validação server-side do pagamento.
      </p>
    </div>
  );
}
