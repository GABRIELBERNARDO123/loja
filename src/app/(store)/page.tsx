import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import {
  ArrowRight,
  ChartIcon,
  CheckIcon,
  DownloadIcon,
  FileIcon,
  GraduationIcon,
  LayoutIcon,
  LockIcon,
  ReceiptIcon,
  ShieldIcon,
  SparklesIcon,
  ZapIcon,
} from "@/components/icons";
import { getHomeData } from "@/lib/products";
import { getStoreSettings } from "@/lib/settings";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Produtos digitais premium com entrega automática",
  description:
    "Planilhas, documentos e materiais digitais prontos para usar. Pagamento via Pix, download imediato e biblioteca protegida.",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  planilhas: <ChartIcon />,
  documentos: <FileIcon />,
  marketing: <SparklesIcon />,
  negocios: <GraduationIcon />,
  financas: <ReceiptIcon />,
  templates: <LayoutIcon />,
};

const FAQ = [
  {
    q: "Como recebo o produto depois da compra?",
    a: "Assim que o pagamento é confirmado pelo provedor, os arquivos são liberados automaticamente na sua biblioteca. Você também encontra o acesso na página do pedido.",
  },
  {
    q: "O pagamento é seguro?",
    a: "Sim. A cobrança é criada no servidor com o valor oficial do produto e processada por um provedor de pagamentos consolidado. Nenhum dado de cartão é armazenado pela loja.",
  },
  {
    q: "Posso baixar mais de uma vez?",
    a: "Cada compra possui um limite configurável de downloads e prazo de acesso. O contador fica visível na sua biblioteca. Se precisar de reativação, fale com o suporte.",
  },
  {
    q: "Os arquivos são originais e editáveis?",
    a: "Cada página de produto informa o formato e a compatibilidade. Os arquivos entregues são os originais disponibilizados pelo produtor, sem marcações de demonstração.",
  },
  {
    q: "Como funciona o reembolso?",
    a: "As condições estão na Política de Reembolso. Falhas técnicas, cobranças duplicadas e indisponibilidade do arquivo são analisadas pelo suporte com prioridade.",
  },
];

export default async function HomePage() {
  const [data, settings] = await Promise.all([getHomeData(), getStoreSettings()]);
  const spotlight = data.featured.slice(0, 3);

  return (
    <>
      <section className="glow-bg relative overflow-hidden pb-20 pt-14 sm:pt-20">
        <div className="absolute inset-x-0 top-0 -z-10 h-[620px] grid-pattern" />
        <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Entrega automática · Pix instantâneo
            </div>

            <h1 className="max-w-2xl font-display text-4xl font-bold leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-[68px]">
              Arquivos que <span className="text-gradient">economizam horas</span> do seu trabalho.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              {settings.tagline}. Planilhas, documentos e materiais profissionais prontos para baixar,
              personalizar e usar no seu próximo projeto.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/produtos" className="btn-primary px-7 py-4 text-base">
                Explorar catálogo <ArrowRight className="text-lg" />
              </Link>
              <Link href="#como-funciona" className="btn-secondary px-7 py-4 text-base">
                Como funciona
              </Link>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {[
                { icon: <ZapIcon />, title: "Liberação imediata", text: "Pagamento confirmado, acesso na hora" },
                { icon: <ShieldIcon />, title: "Compra protegida", text: "Valores validados no servidor" },
                { icon: <DownloadIcon />, title: "Arquivos originais", text: "Download pela biblioteca" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="flex items-center gap-2 font-semibold text-white [&_svg]:text-brand">
                    {item.icon}
                    {item.title}
                  </dt>
                  <dd className="mt-1.5 text-xs leading-5 text-zinc-500">{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden animate-fade-in lg:block" aria-hidden="true">
            <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-wine-500/15 via-transparent to-neon-500/15 blur-2xl" />
            <div className="relative rounded-[28px] border border-white/10 bg-ink-900/70 p-5 shadow-card backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Sua biblioteca</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">Pronto para download</p>
                </div>
                <span className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Pago
                </span>
              </div>
              <div className="space-y-3">
                {spotlight.map((product, index) => (
                  <div
                    key={product.id}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-wine-500/20 to-neon-500/20 text-lg text-wine-300">
                      <FileIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                        {product.fileFormat} · {product.category?.name ?? "Digital"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatBRL(product.priceCents)}</p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                        <CheckIcon /> liberado
                      </p>
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-500 transition-colors group-hover:text-white">
                      <DownloadIcon />
                    </span>
                    {index === 0 && <span className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-wine-500 shadow-glow" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-ink-950/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-400"><LockIcon className="text-emerald-400" /> Download verificado</span>
                  <span className="text-emerald-400">seguro</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-8 animate-float rounded-2xl border border-white/10 bg-ink-850/90 p-4 shadow-card backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-wine-500/15 text-wine-400"><ZapIcon /></span>
                <div>
                  <p className="text-xs font-semibold text-white">Pix confirmado</p>
                  <p className="text-[10px] text-zinc-500">acesso em poucos segundos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Seleção da loja</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Produtos em destaque</h2>
          </div>
          <Link href="/produtos" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white">
            Ver catálogo completo <ArrowRight />
          </Link>
        </div>
        {spotlight.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spotlight.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <p className="text-sm text-zinc-400">Nenhum produto publicado ainda.</p>
            <p className="mt-1 text-xs text-zinc-600">Cadastre o primeiro produto no painel administrativo.</p>
          </div>
        )}
      </section>

      {data.categories.length > 0 && (
        <section className="container-page py-14">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Navegue por objetivo</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Categorias</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.categories.map((category) => (
              <Link
                key={category.id}
                href={`/produtos?categoria=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/60 p-6 transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-ink-800/70"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-neon-500/10 blur-2xl transition-opacity group-hover:bg-wine-500/15" />
                <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-wine-300">
                  {CATEGORY_ICONS[category.slug] ?? <FolderGlyph />}
                </span>
                <h3 className="font-display text-lg font-semibold text-white">{category.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{category.description ?? "Produtos digitais selecionados."}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 group-hover:text-white">
                  Explorar <ArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-14" aria-labelledby="beneficios">
        <div className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10">
          <div className="mb-10 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Por que comprar aqui</p>
            <h2 id="beneficios" className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Uma experiência de compra feita para produtos digitais
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <ZapIcon />, title: "Entrega automática", text: "O acesso é liberado após a confirmação do pagamento, sem espera manual." },
              { icon: <LockIcon />, title: "Download protegido", text: "Links autenticados, armazenamento privado e controle de acessos." },
              { icon: <ShieldIcon />, title: "Valor validado", text: "Preço, desconto e total recalculados no servidor a cada compra." },
              { icon: <SparklesIcon />, title: "Curadoria", text: "Arquivos organizados, com formato e compatibilidade informados." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-ink-950/40 p-6">
                <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-lg text-wine-300">{item.icon}</span>
                <h3 className="font-display text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="container-page scroll-mt-24 py-14">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Simples do início ao download</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Como funciona a compra</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-500">
              Escolha o arquivo, pague via Pix e receba o acesso na sua biblioteca. Sem cadastro complicado, sem
              entrega manual e sem surpresas no valor.
            </p>
            <Link href="/produtos" className="btn-secondary mt-6">
              Começar agora <ArrowRight />
            </Link>
          </div>
          <ol className="relative space-y-4 border-l border-white/10 pl-8">
            {[
              { title: "Escolha seu produto", text: "Navegue pelo catálogo, veja o formato e os detalhes antes de comprar." },
              { title: "Pague com Pix", text: "Escaneie o QR Code ou use o Pix copia e cola. A cobrança expira com segurança." },
              { title: "Receba o acesso", text: "Após a confirmação, os downloads aparecem na sua biblioteca, protegidos por autenticação." },
            ].map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
                <span className="absolute -left-[45px] top-5 grid h-7 w-7 place-items-center rounded-full border border-wine-500/30 bg-ink-950 text-xs font-bold text-wine-300">
                  {index + 1}
                </span>
                <h3 className="font-display text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Dúvidas frequentes</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Antes de comprar</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Não encontrou sua resposta?{" "}
              <Link href="/paginas/contato" className="font-semibold text-white underline decoration-white/20 underline-offset-4 hover:decoration-wine-400">
                Fale com o suporte
              </Link>
              .
            </p>
          </div>
          <div className="divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4 open:bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-transform group-open:rotate-45">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <p className="mt-3 pr-8 text-sm leading-6 text-zinc-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-wine-500/15 via-ink-900 to-neon-500/15 p-8 sm:p-14">
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="relative max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-wine-300">Seu próximo projeto começa aqui</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Menos tempo montando. Mais tempo entregando.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300 sm:text-base">
              Encontre o arquivo certo, pague com Pix e baixe imediatamente. Acesso organizado, seguro e sempre
              disponível na sua conta.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/produtos" className="btn-primary px-7 py-4 text-base">
                Ver produtos <ArrowRight className="text-lg" />
              </Link>
              <Link href="/criar-conta" className="btn-secondary px-7 py-4 text-base">
                Criar minha conta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
