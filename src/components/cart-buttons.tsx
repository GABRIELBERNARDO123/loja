"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrashIcon } from "@/components/icons";

export function RemoveCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function remove() {
    setLoading(true);
    try {
      const response = await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Não foi possível remover.");
      toast.success("Produto removido.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-zinc-500 transition-colors hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
      aria-label="Remover produto do carrinho"
    >
      <TrashIcon />
    </button>
  );
}
