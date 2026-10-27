import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv, isProduction } from "@/lib/env";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getEnv();

  if (!env.RESEND_API_KEY) {
    if (isProduction()) {
      throw new Error("Serviço de e-mail não configurado. Defina RESEND_API_KEY em produção.");
    }
    await writeDevOutbox(message);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html ?? `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeHtml(message.text).replaceAll("\n", "<br>")}</div>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha no envio de e-mail (status ${response.status}).`);
  }
}

async function writeDevOutbox(message: EmailMessage): Promise<void> {
  const dir = path.join(process.cwd(), getEnv().LOCAL_STORAGE_DIR, "dev-emails");
  await mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify({ ...message, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
}

export function buildEmailLayout(storeName: string, title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#08080d;padding:32px;font-family:Arial,sans-serif;color:#e8e8f0">
  <div style="max-width:560px;margin:0 auto;background:#12121b;border:1px solid #26263a;border-radius:18px;padding:32px">
    <p style="margin:0 0 8px;color:#ff5d78;font-size:12px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(storeName)}</p>
    <h1 style="margin:0 0 20px;font-size:24px">${escapeHtml(title)}</h1>
    <div style="color:#c9c9d8;font-size:15px;line-height:1.7">${safeBody(body)}</div>
    <p style="margin:28px 0 0;font-size:12px;color:#7d7d92">Se você não solicitou esta mensagem, ignore este e-mail.</p>
  </div>
</body></html>`;
}

function safeBody(body: string): string {
  return body
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
}
