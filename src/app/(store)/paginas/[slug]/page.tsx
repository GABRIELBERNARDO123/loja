import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { getStoreSettings, legalPageContent } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getStoreSettings();
  const page = legalPageContent(settings, slug);
  if (!page) return { title: "Página não encontrada" };
  return { title: page.title, description: `${page.title} de ${settings.storeName}.` };
}

export default async function LegalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const settings = await getStoreSettings();
  const page = legalPageContent(settings, slug);
  if (!page) notFound();

  return (
    <div className="container-page max-w-4xl py-12 sm:py-16">
      <nav className="mb-6 text-xs text-zinc-500" aria-label="Trilha">
        <Link href="/" className="hover:text-white">Início</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{page.title}</span>
      </nav>
      <div className="rounded-3xl border border-white/[0.08] bg-ink-850/40 p-6 sm:p-10">
        <Markdown content={page.content} />
      </div>
      <p className="mt-6 text-[11px] text-zinc-600">
        Última atualização: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(settings.updatedAt)}.
        {" "}Documento editável pelo painel administrativo.
      </p>
    </div>
  );
}
