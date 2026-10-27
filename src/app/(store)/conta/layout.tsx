import { AccountNav } from "@/components/account-nav";
import { requireUser } from "@/lib/auth/guards";
import { LogOutButton } from "@/components/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/conta");

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-wine-500 to-neon-500 font-display text-lg font-bold text-white shadow-glow">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
              </div>
            </div>
            {user.role.name === "ADMIN" && (
              <p className="mt-3 inline-flex rounded-full border border-wine-500/25 bg-wine-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-wine-300">
                Administrador
              </p>
            )}
          </div>
          <AccountNav />
          <LogOutButton />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
