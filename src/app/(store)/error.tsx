"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro na loja", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <p className="font-display text-6xl font-bold text-gradient">Ops</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Algo não saiu como esperado</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Não foi possível carregar esta área agora. Tente novamente. Se o problema persistir, fale com o suporte.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary">Tentar novamente</button>
          <Link href="/" className="btn-secondary">Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}
