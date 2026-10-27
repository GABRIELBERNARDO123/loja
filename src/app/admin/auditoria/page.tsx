import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const perPage = 50;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Segurança</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Auditoria</h1>
        <p className="mt-1 text-sm text-zinc-500">Registro de ações administrativas, autenticação, pagamentos e downloads.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Ator</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Metadados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-[11px] text-zinc-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-zinc-300">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-zinc-400">{log.actorEmail ?? (log.actorId ? log.actorId.slice(0, 10) : "sistema")}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">
                    {log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 10)}…` : ""}
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-all font-mono text-[9px] leading-4 text-zinc-600">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-zinc-500">Nenhum registro de auditoria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 20).map((number) => (
            <a
              key={number}
              href={`/admin/auditoria?page=${number}`}
              className={number === page ? "grid h-8 min-w-8 place-items-center rounded-lg bg-white text-xs font-bold text-black" : "grid h-8 min-w-8 place-items-center rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white"}
            >
              {number}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
