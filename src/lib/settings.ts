import { cache } from "react";
import type { StoreSettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_CONTACT,
  DEFAULT_LICENSE,
  DEFAULT_PRIVACY,
  DEFAULT_REFUND,
  DEFAULT_TERMS,
} from "@/lib/default-content";

export const defaultSettingsData = {
  id: "default",
  storeName: "Vértice Digital",
  tagline: "Conhecimento que destrava resultados",
  supportEmail: "",
  whatsapp: "",
  instagram: "",
  legalName: "",
  document: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  primaryColor: "#f4315b",
  accentColor: "#8b5cf6",
  termsContent: DEFAULT_TERMS,
  privacyContent: DEFAULT_PRIVACY,
  refundContent: DEFAULT_REFUND,
  licenseContent: DEFAULT_LICENSE,
  contactContent: DEFAULT_CONTACT,
  defaultDownloadLimit: 10,
  defaultExpiryDays: 365,
  pixExpirationMinutes: 30,
} as const;

export async function ensureStoreSettings(): Promise<StoreSettings> {
  return prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: defaultSettingsData,
  });
}

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  if (settings) return settings;
  return ensureStoreSettings();
});

export const LEGAL_PAGES = {
  termos: { field: "termsContent", title: "Termos de uso" },
  privacidade: { field: "privacyContent", title: "Política de privacidade" },
  reembolso: { field: "refundContent", title: "Política de reembolso" },
  licenca: { field: "licenseContent", title: "Licenciamento dos arquivos" },
  contato: { field: "contactContent", title: "Contato" },
} as const;

export type LegalSlug = keyof typeof LEGAL_PAGES;

export function legalPageContent(settings: StoreSettings, slug: string): { title: string; content: string } | null {
  const page = LEGAL_PAGES[slug as LegalSlug];
  if (!page) return null;
  return { title: page.title, content: settings[page.field as keyof StoreSettings] as string };
}
