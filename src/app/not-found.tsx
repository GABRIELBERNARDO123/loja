export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-6">
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-wine-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 h-72 w-72 rounded-full bg-neon-500/10 blur-3xl" />
      <div className="relative max-w-lg text-center">
        <p className="font-display text-8xl font-bold text-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          O endereço pode ter sido alterado, removido ou nunca existiu. Volte ao catálogo para continuar navegando.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">Voltar ao início</Link>
          <Link href="/produtos" className="btn-secondary">Ver catálogo <ArrowRight /></Link>
        </div>
      </div>
    </div>
  );
}
