import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Painel administrativo", template: "%s — Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const settings = await getStoreSettings();

  return (
    <AdminShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      userName={admin.name}
      userEmail={admin.email}
    >
      {children}
    </AdminShell>
  );
}
