import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStoreSettings } from "@/lib/settings";
import { paymentConfigurationStatus } from "@/lib/payments/service";
import { appUrl, getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  const payments = paymentConfigurationStatus();
  const env = getEnv();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Loja</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-zinc-500">Identidade, políticas, conteúdo legal e parâmetros de entrega digital.</p>
      </div>
      <SettingsForm
        initial={{
          storeName: settings.storeName,
          tagline: settings.tagline,
          logoUrl: settings.logoUrl ?? "",
          supportEmail: settings.supportEmail,
          whatsapp: settings.whatsapp,
          instagram: settings.instagram,
          legalName: settings.legalName,
          document: settings.document,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zip: settings.zip,
          phone: settings.phone,
          primaryColor: settings.primaryColor,
          accentColor: settings.accentColor,
          termsContent: settings.termsContent,
          privacyContent: settings.privacyContent,
          refundContent: settings.refundContent,
          licenseContent: settings.licenseContent,
          contactContent: settings.contactContent,
          defaultDownloadLimit: settings.defaultDownloadLimit,
          defaultExpiryDays: settings.defaultExpiryDays,
          pixExpirationMinutes: settings.pixExpirationMinutes,
        }}
        integrations={{
          appUrl: appUrl(),
          paymentConfigured: payments.configured,
          paymentEnvironment: payments.environment,
          paymentMissing: payments.missing,
          storageDriver: env.STORAGE_DRIVER,
          emailConfigured: Boolean(env.RESEND_API_KEY),
        }}
      />
    </div>
  );
}
