"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertIcon, CheckIcon, UploadIcon } from "@/components/icons";

export type SettingsFormData = {
  storeName: string;
  tagline: string;
  logoUrl: string;
  supportEmail: string;
  whatsapp: string;
  instagram: string;
  legalName: string;
  document: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  primaryColor: string;
  accentColor: string;
  termsContent: string;
  privacyContent: string;
  refundContent: string;
  licenseContent: string;
  contactContent: string;
  defaultDownloadLimit: number;
  defaultExpiryDays: number;
  pixExpirationMinutes: number;
};

const TABS = [
  { id: "geral", label: "Geral" },
  { id: "marca", label: "Marca" },
  { id: "operacao", label: "Operação" },
  { id: "legal", label: "Conteúdo legal" },
  { id: "integracoes", label: "Integrações" },
] as const;

export function SettingsForm({
  initial,
  integrations,
}: {
  initial: SettingsFormData;
  integrations: {
    appUrl: string;
    paymentConfigured: boolean;
    paymentEnvironment: string;
    paymentMissing: string[];
    storageDriver: string;
    emailConfigured: boolean;
  };
}) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("geral");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  function update<K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/admin/upload-image", { method: "POST", body: data });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) throw new Error(payload.error ?? "Falha no upload.");
      update("logoUrl", payload.url);
      toast.success("Logotipo enviado. Salve as configurações.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar logo.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string[]> };
      if (!response.ok || !data.ok) {
        throw new Error((data.fields ? Object.values(data.fields).flat()[0] : undefined) ?? data.error ?? "Erro ao salvar.");
      }
      toast.success("Configurações salvas.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-ink-850/50 p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${tab === item.id ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-200"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Identidade e contato</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="label">Nome da loja</label>
              <input id="settings-name" required value={form.storeName} onChange={(event) => update("storeName", event.target.value)} className="input" maxLength={80} />
            </div>
            <div>
              <label htmlFor="settings-support" className="label">E-mail de suporte</label>
              <input id="settings-support" type="email" value={form.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-tagline" className="label">Tagline</label>
              <input id="settings-tagline" required value={form.tagline} onChange={(event) => update("tagline", event.target.value)} className="input" maxLength={160} />
            </div>
            <div>
              <label htmlFor="settings-whatsapp" className="label">WhatsApp (com DDD)</label>
              <input id="settings-whatsapp" value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="input" placeholder="11 99999-9999" />
            </div>
            <div>
              <label htmlFor="settings-instagram" className="label">Instagram</label>
              <input id="settings-instagram" value={form.instagram} onChange={(event) => update("instagram", event.target.value)} className="input" placeholder="@sualoja" />
            </div>
          </div>

          <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Dados comerciais (transparência)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-legal" className="label">Razão social / nome</label>
              <input id="settings-legal" value={form.legalName} onChange={(event) => update("legalName", event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="settings-doc" className="label">CNPJ / CPF</label>
              <input id="settings-doc" value={form.document} onChange={(event) => update("document", event.target.value)} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-address" className="label">Endereço</label>
              <input id="settings-address" value={form.address} onChange={(event) => update("address", event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="settings-city" className="label">Cidade</label>
              <input id="settings-city" value={form.city} onChange={(event) => update("city", event.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-state" className="label">UF</label>
                <input id="settings-state" value={form.state} onChange={(event) => update("state", event.target.value)} className="input" maxLength={2} />
              </div>
              <div>
                <label htmlFor="settings-zip" className="label">CEP</label>
                <input id="settings-zip" value={form.zip} onChange={(event) => update("zip", event.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label htmlFor="settings-phone" className="label">Telefone</label>
              <input id="settings-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="input" />
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-5 text-amber-200/80">
            <AlertIcon className="mt-0.5 shrink-0" />
            Não invente CNPJ, endereço ou dados comerciais. Preencha com informações reais do fornecedor antes de publicar.
          </p>
        </section>
      )}

      {tab === "marca" && (
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Marca e aparência</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-logo" className="label">Logotipo</label>
              <div className="flex gap-2">
                <input id="settings-logo" value={form.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} className="input" placeholder="https://... ou upload" />
                <label className={`btn-secondary btn-sm cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                  <UploadIcon /> {uploading ? "..." : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLogo(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-primary" className="label">Cor primária</label>
                <div className="flex gap-2">
                  <input type="color" value={form.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} className="h-11 w-12 rounded-lg border border-white/10 bg-transparent" />
                  <input id="settings-primary" value={form.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label htmlFor="settings-accent" className="label">Cor secundária</label>
                <div className="flex gap-2">
                  <input type="color" value={form.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="h-11 w-12 rounded-lg border border-white/10 bg-transparent" />
                  <input id="settings-accent" value={form.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="input" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] p-5" style={{ background: `linear-gradient(135deg, ${form.primaryColor}22, ${form.accentColor}22)` }}>
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-wine-500 to-neon-500 font-bold text-white">V</span>
              )}
              <div>
                <p className="font-display text-lg font-bold text-white">{form.storeName || "Nome da loja"}</p>
                <p className="text-[11px] text-zinc-500">{form.tagline || "Sua tagline"}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: form.primaryColor }}>Botão principal</span>
              <span className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white">Botão secundário</span>
            </div>
          </div>
        </section>
      )}

      {tab === "operacao" && (
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-white">Políticas operacionais</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="settings-download-limit" className="label">Downloads padrão</label>
              <input id="settings-download-limit" type="number" min={1} max={1000} value={form.defaultDownloadLimit} onChange={(event) => update("defaultDownloadLimit", Number(event.target.value))} className="input" />
            </div>
            <div>
              <label htmlFor="settings-expiry-days" className="label">Prazo padrão (dias)</label>
              <input id="settings-expiry-days" type="number" min={1} max={3650} value={form.defaultExpiryDays} onChange={(event) => update("defaultExpiryDays", Number(event.target.value))} className="input" />
            </div>
            <div>
              <label htmlFor="settings-pix-expiry" className="label">Expiração do Pix (min)</label>
              <input id="settings-pix-expiry" type="number" min={5} max={1440} value={form.pixExpirationMinutes} onChange={(event) => update("pixExpirationMinutes", Number(event.target.value))} className="input" />
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-zinc-600">
            Os valores padrão são copiados para o produto no momento do cadastro. Alterações posteriores não modificam
            produtos ou pedidos existentes.
          </p>
        </section>
      )}

      {tab === "legal" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-[11px] leading-5 text-amber-200/80">
            Conteúdo editável em Markdown. Revise com apoio jurídico e preencha os dados institucionais. Não publicamos
            documentos legais fictícios.
          </div>
          {[
            { key: "termsContent" as const, label: "Termos de uso" },
            { key: "privacyContent" as const, label: "Política de privacidade" },
            { key: "refundContent" as const, label: "Política de reembolso" },
            { key: "licenseContent" as const, label: "Licenciamento dos arquivos" },
            { key: "contactContent" as const, label: "Contato" },
          ].map((field) => (
            <div key={field.key} className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
              <label htmlFor={field.key} className="label">{field.label}</label>
              <textarea
                id={field.key}
                rows={12}
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className="input resize-y font-mono text-[12px] leading-6"
              />
            </div>
          ))}
        </section>
      )}

      {tab === "integracoes" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-white">Status das integrações (somente leitura)</h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <div><p className="font-medium text-zinc-200">Aplicação / URL pública</p><p className="mt-0.5 text-zinc-600">{integrations.appUrl}</p></div>
                <span className="badge">APP_URL</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-200">Mercado Pago — Pix</p>
                  <p className="mt-0.5 text-zinc-600">
                    {integrations.paymentConfigured ? `Configurado · ambiente ${integrations.paymentEnvironment}` : `Pendente: ${integrations.paymentMissing.join(", ")}`}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${integrations.paymentConfigured ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
                  {integrations.paymentConfigured ? "Ativo" : "Pendente"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <div><p className="font-medium text-zinc-200">Armazenamento privado</p><p className="mt-0.5 text-zinc-600">{integrations.storageDriver}</p></div>
                <span className="badge">{integrations.storageDriver === "vercel-blob" ? "Vercel Blob" : "Local (dev)"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <div><p className="font-medium text-zinc-200">E-mail transacional</p><p className="mt-0.5 text-zinc-600">{integrations.emailConfigured ? "Resend configurado" : "Pendente (RESEND_API_KEY)"}</p></div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${integrations.emailConfigured ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
                  {integrations.emailConfigured ? "Ativo" : "Pendente"}
                </span>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-zinc-600">
              <AlertIcon className="mt-0.5 shrink-0" />
              Credenciais não são exibidas nem editáveis pelo navegador. Configure as variáveis na Vercel e faça um novo deploy.
            </p>
          </div>
        </section>
      )}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur-xl">
        <p className="hidden items-center gap-2 text-[11px] text-zinc-500 sm:flex">
          <CheckIcon className="text-emerald-400" /> Alterações auditadas no servidor
        </p>
        <button type="submit" disabled={loading} className="btn-primary ml-auto">
          {loading ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
