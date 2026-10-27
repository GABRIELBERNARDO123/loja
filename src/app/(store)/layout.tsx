import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getCurrentUser } from "@/lib/auth/session";
import { countCartItems } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getStoreSettings()]);
  const cartCount = await countCartItems(user?.id ?? null);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
        cartCount={cartCount}
        user={
          user
            ? {
                name: user.name,
                email: user.email,
                isAdmin: user.role.name === "ADMIN",
              }
            : null
        }
      />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Footer
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
        supportEmail={settings.supportEmail}
        whatsapp={settings.whatsapp}
        legalName={settings.legalName}
        document={settings.document}
        address={settings.address}
        city={settings.city}
        state={settings.state}
      />
    </div>
  );
}
