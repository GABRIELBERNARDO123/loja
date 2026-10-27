"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";

export function ActionButton({
  url,
  method = "POST",
  body,
  children,
  confirmMessage,
  successMessage,
  className = "btn-secondary btn-sm",
  pendingLabel = "Processando...",
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  children: React.ReactNode;
  confirmMessage?: string;
  successMessage?: string;
  className?: string;
  pendingLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
      toast.success(data.message ?? successMessage ?? "Ação concluída.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao executar ação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={loading} className={clsx(className)}>
      {loading ? pendingLabel : children}
    </button>
  );
}
