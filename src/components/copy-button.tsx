"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, WhatsappIcon } from "@/components/icons";

export function CopyButton({
  value,
  label = "Copiar",
  className = "btn-secondary btn-sm",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export function ShareWhatsApp({ text, className = "btn-ghost btn-sm" }: { text: string; className?: string }) {
  function share() {
    const url = `${window.location.href}`;
    const message = `${text}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={share} className={className}>
      <WhatsappIcon /> Compartilhar
    </button>
  );
}
