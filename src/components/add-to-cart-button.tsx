"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";
import { CartIcon, ZapIcon } from "@/components/icons";

async function addToCart(productId: string): Promise<void> {
  const response = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; count?: number };
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Não foi possível adicionar ao carrinho.");
}

export function AddToCartButton({
  productId,
  compact = false,
  buyNow = false,
  className,
}: {
  productId: string;
  compact?: boolean;
  buyNow?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      await addToCart(productId);
      if (buyNow) {
        router.push("/checkout");
        return;
      }
      toast.success("Produto adicionado ao carrinho.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar ao carrinho.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={clsx("btn-primary btn-sm", className)}
        aria-label="Adicionar ao carrinho"
      >
        <CartIcon className="text-base" />
        {loading ? "..." : "Adicionar"}
      </button>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-3 sm:flex-row", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={buyNow ? "btn-primary flex-1 py-4 text-base" : "btn-primary flex-1 py-4 text-base"}
      >
        {buyNow ? <ZapIcon className="text-lg" /> : <CartIcon className="text-lg" />}
        {loading ? "Processando..." : buyNow ? "Comprar agora" : "Adicionar ao carrinho"}
      </button>
    </div>
  );
}
