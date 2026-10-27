import Link from "next/link";
import { Logo } from "@/components/logo";
import { LockIcon, MailIcon, ShieldIcon, WhatsappIcon } from "@/components/icons";

export function Footer({
  storeName,
  logoUrl,
  supportEmail,
  whatsapp,
  legalName,
  document,
  address,
  city,
  state,
}: {
  storeName: string;
  logoUrl: string | null;
  supportEmail: string;
  whatsapp: string;
  legalName: string;
  document: string;
  address: string;
  city: string;
  state: string;
}) {
  const year = new Date().getFullYear();
  const whatsappDigits = whatsapp.replace(/\D/g, "");

  return (
    <footer className="relative mt-24 border-t border-white/[0.08] bg-ink-950">
      <div className="container-page grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo name={storeName} logoUrl={logoUrl} />
          <p className="max-w-xs text-sm leading-6 text-zinc-500">
            Produtos digitais selecionados para acelerar seu trabalho, com pagamento seguro via Pix e entrega
            automática.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="badge">
              <LockIcon /> Compra segura
            </span>
            <span className="badge">
              <ShieldIcon /> LGPD
            </span>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Loja</h2>
          <ul className="space-y-2.5 text-sm text-zinc-400">
            <li><Link className="hover:text-white" href="/produtos">Catálogo</Link></li>
            <li><Link className="hover:text-white" href="/carrinho">Carrinho</Link></li>
            <li><Link className="hover:text-white" href="/conta/biblioteca">Minha biblioteca</Link></li>
            <li><Link className="hover:text-white" href="/conta/pedidos">Meus pedidos</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Informações</h2>
          <ul className="space-y-2.5 text-sm text-zinc-400">
            <li><Link className="hover:text-white" href="/paginas/termos">Termos de uso</Link></li>
            <li><Link className="hover:text-white" href="/paginas/privacidade">Privacidade</Link></li>
            <li><Link className="hover:text-white" href="/paginas/reembolso">Reembolso</Link></li>
            <li><Link className="hover:text-white" href="/paginas/licenca">Licenciamento</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Atendimento</h2>
          <ul className="space-y-3 text-sm text-zinc-400">
            {supportEmail ? (
              <li>
                <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 hover:text-white">
                  <MailIcon /> {supportEmail}
                </a>
              </li>
            ) : (
              <li className="text-zinc-600">E-mail de suporte a configurar</li>
            )}
            {whatsappDigits ? (
              <li>
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <WhatsappIcon /> WhatsApp
                </a>
              </li>
            ) : null}
            <li><Link className="hover:text-white" href="/paginas/contato">Central de contato</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.08]">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-zinc-600 md:flex-row md:items-center md:justify-between">
          <p>© {year} {storeName}. Todos os direitos reservados.</p>
          <p className="max-w-xl md:text-right">
            {legalName || "Razão social a configurar"}
            {document ? ` · ${document}` : ""}
            {address ? ` · ${address}` : ""}
            {city ? ` · ${city}` : ""}
            {state ? `/${state}` : ""}
          </p>
        </div>
      </div>
    </footer>
  );
}
