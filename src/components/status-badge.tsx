import clsx from "clsx";

const STYLES: Record<string, string> = {
  PAID: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  APPROVED: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  ACTIVE: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  PENDING: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  IN_PROCESS: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  EXPIRED: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400",
  CANCELED: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400",
  CANCELLED: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400",
  FAILED: "border-red-400/25 bg-red-400/10 text-red-300",
  REJECTED: "border-red-400/25 bg-red-400/10 text-red-300",
  REFUNDED: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  CHARGED_BACK: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  CHARGEBACK: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  REVOKED: "border-red-400/25 bg-red-400/10 text-red-300",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        STYLES[status] ?? "border-white/10 bg-white/5 text-zinc-300",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
