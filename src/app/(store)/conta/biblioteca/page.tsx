import type { Metadata } from "next";
import Link from "next/link";
import { AlertIcon, DownloadIcon, FileIcon, LockIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Minha biblioteca", robots: { index: false, follow: false } };

export default async function LibraryPage() {
  const user = await requireUser("/conta/biblioteca");
  const entitlements = await prisma.downloadEntitlement.findMany({
    where: { userId: user.id },
    include: { product: true, productFile: true, order: true },
    orderBy: [{ createdAt: "desc" }, { productFileId: "asc" }],
  });

  const grouped = new Map<string, typeof entitlements>();
  for (const item of entitlements) {
    const list = grouped.get(item.productId) ?? [];
    list.push(item);
    grouped.set(item.productId, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Downloads</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Minha biblioteca</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Seus arquivos ficam disponíveis enquanto o prazo e o limite de downloads permitirem.
        </p>
      </div>

      {entitlements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-zinc-500">
            <LockIcon />
          </span>
          <h2 className="font-display text-xl font-semibold text-white">Nenhum arquivo liberado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Após a confirmação de um pagamento, seus produtos aparecerão aqui automaticamente.
          </p>
          <Link href="/produtos" className="btn-primary mt-6">Explorar catálogo</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([productId, files]) => {
            const product = files[0]?.product;
            if (!product) return null;
            return (
              <section key={productId} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
                <div className="flex flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-wine-500/10 to-neon-500/10 text-2xl text-wine-300">
                    {product.coverImageUrl ? (
                      <img src={product.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileIcon />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold text-white">{product.name}</h2>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                      {product.fileFormat} · pedido {files[0]?.order.code}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Compra em {formatDate(files[0]?.order.createdAt ?? new Date())}
                    </p>
                  </div>
                  <Link href={`/produto/${product.slug}`} className="btn-ghost btn-sm shrink-0">Ver produto</Link>
                </div>

                <ul className="divide-y divide-white/[0.08]">
                  {files.map((entitlement) => {
                    const expired = entitlement.expiresAt.getTime() <= Date.now();
                    const blocked = entitlement.status !== "ACTIVE" || expired || entitlement.downloadCount >= entitlement.maxDownloads || entitlement.order.status !== "PAID";
                    return (
                      <li key={entitlement.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-wine-300">
                            <FileIcon />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-zinc-200">{entitlement.productFile.originalName}</p>
                            <p className="mt-0.5 text-[10px] text-zinc-600">
                              {(entitlement.productFile.sizeBytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                              {entitlement.downloadCount} de {entitlement.maxDownloads} downloads · até {formatDate(entitlement.expiresAt)}
                            </p>
                          </div>
                        </div>
                        {blocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-300">
                            <AlertIcon />
                            {expired ? "Prazo expirado" : entitlement.status !== "ACTIVE" ? "Acesso revogado" : "Limite atingido"}
                          </span>
                        ) : (
                          <a
                            href={`/api/download/${entitlement.id}`}
                            className="btn-primary btn-sm shrink-0"
                            aria-label={`Baixar ${entitlement.productFile.originalName}`}
                          >
                            <DownloadIcon /> Baixar arquivo
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-[11px] leading-5 text-zinc-500">
            <p className="flex items-start gap-2">
              <LockIcon className="mt-0.5 shrink-0 text-emerald-500" />
              Os downloads são liberados por links autenticados e vinculados à sua conta. Cada tentativa é registrada.
              Se o limite ou prazo terminar, entre em contato com o suporte para avaliar a reativação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
