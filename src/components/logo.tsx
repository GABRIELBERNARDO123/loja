import Link from "next/link";
import clsx from "clsx";

export function Logo({
  name,
  href = "/",
  logoUrl,
  compact = false,
  className,
}: {
  name: string;
  href?: string;
  logoUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={clsx("group inline-flex items-center gap-3", className)} aria-label={name}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="h-9 w-9 rounded-xl border border-white/10 object-cover"
        />
      ) : (
        <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-wine-500 via-fuchsia-600 to-neon-500 shadow-glow transition-transform duration-300 group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M5 6h4l3 8 3-8h4l-5.2 13h-3.6L5 6Z" fill="white" fillOpacity="0.95" />
          </svg>
        </span>
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-tight text-white">{name}</span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Produtos digitais
          </span>
        </span>
      )}
    </Link>
  );
}
