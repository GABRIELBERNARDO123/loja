import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Order, OrderItem, Payment } from "@prisma/client";
import { appUrl, getEnv } from "@/lib/env";

const MP_API = "https://api.mercadopago.com";

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super("Pagamento Pix ainda não configurado nesta loja.");
    this.name = "PaymentNotConfiguredError";
  }
}

export class PaymentProviderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "PaymentProviderError";
    this.status = status;
  }
}

export const mpPaymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  status_detail: z.string().nullish(),
  transaction_amount: z.number().nonnegative(),
  currency_id: z.string(),
  external_reference: z.string().nullish(),
  collector_id: z.union([z.string(), z.number()]).nullish(),
  live_mode: z.boolean().nullish(),
  payment_method_id: z.string().nullish(),
  date_of_expiration: z.string().nullish(),
  point_of_interaction: z
    .object({
      transaction_data: z
        .object({
          qr_code: z.string().nullish(),
          qr_code_base64: z.string().nullish(),
          ticket_url: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

export type MpPayment = z.infer<typeof mpPaymentSchema>;

export function paymentsConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.MERCADO_PAGO_ACCESS_TOKEN);
}

function accessToken(): string {
  const env = getEnv();
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) throw new PaymentNotConfiguredError();
  return env.MERCADO_PAGO_ACCESS_TOKEN;
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${MP_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PaymentProviderError("O provedor de pagamento demorou para responder.");
    }
    throw new PaymentProviderError("Não foi possível contatar o provedor de pagamento.");
  } finally {
    clearTimeout(timeout);
  }
}

type OrderWithItems = Order & { items: OrderItem[] };

export async function createPixPayment(order: OrderWithItems, attempt: number): Promise<{
  providerPaymentId: string;
  status: string;
  statusDetail: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: Date | null;
  raw: MpPayment;
}> {
  const env = getEnv();
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) throw new PaymentNotConfiguredError();

  const baseUrl = appUrl();
  if (env.NODE_ENV === "production" && !baseUrl.startsWith("https://")) {
    throw new PaymentProviderError("APP_URL deve usar HTTPS em produção.", 500);
  }

  const firstName = order.customerName.split(" ")[0]?.slice(0, 60) || "Cliente";
  const lastName = order.customerName.split(" ").slice(1).join(" ").slice(0, 60) || "Digital";

  const body = {
    transaction_amount: order.totalCents / 100,
    description: `Pedido ${order.code} - produtos digitais`,
    payment_method_id: "pix",
    external_reference: order.id,
    notification_url: `${baseUrl}/api/webhooks/mercadopago?source_news=webhooks`,
    date_of_expiration: order.expiresAt?.toISOString(),
    payer: {
      email: order.customerEmail,
      first_name: firstName,
      last_name: lastName,
    },
    metadata: { order_code: order.code, order_id: order.id },
  };

  const response = await mpFetch("/v1/payments", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": `order-${order.id}-${attempt}`.slice(0, 64),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("Mercado Pago rejeitou a criação do Pix", response.status);
    throw new PaymentProviderError("Não foi possível gerar a cobrança Pix. Tente novamente.", 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PaymentProviderError("Resposta inválida do provedor de pagamento.");
  }
  const payment = mpPaymentSchema.parse(parsed);

  const amountCents = Math.round(payment.transaction_amount * 100);
  if (amountCents !== order.totalCents || payment.currency_id !== "BRL") {
    throw new PaymentProviderError("Cobrança divergente do pedido. Operação cancelada.", 502);
  }
  if (payment.external_reference !== order.id) {
    throw new PaymentProviderError("Referência de cobrança divergente. Operação cancelada.", 502);
  }

  const qr = payment.point_of_interaction?.transaction_data;
  return {
    providerPaymentId: String(payment.id),
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    qrCode: qr?.qr_code ?? null,
    qrCodeBase64: qr?.qr_code_base64 ?? null,
    ticketUrl: qr?.ticket_url ?? null,
    expiresAt: payment.date_of_expiration ? new Date(payment.date_of_expiration) : null,
    raw: payment,
  };
}

export async function fetchPayment(providerPaymentId: string): Promise<MpPayment> {
  const response = await mpFetch(`/v1/payments/${encodeURIComponent(providerPaymentId)}`);
  if (!response.ok) {
    throw new PaymentProviderError("Pagamento não encontrado no provedor.", response.status === 404 ? 404 : 502);
  }
  const parsed = mpPaymentSchema.safeParse(await response.json());
  if (!parsed.success) throw new PaymentProviderError("Resposta inválida do provedor de pagamento.");
  return parsed.data;
}

export function verifyWebhookSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string | null;
}): boolean {
  if (!params.secret) return false;
  if (!params.signatureHeader || !params.dataId) return false;

  const parts = new Map<string, string>();
  for (const part of params.signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts.set(key.trim(), value.trim());
  }
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return false;

  const segments = [`id:${params.dataId}`];
  if (params.requestId) segments.push(`request-id:${params.requestId}`);
  segments.push(`ts:${ts}`);
  const manifest = `${segments.join(";")};`;

  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(v1, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function mapPaymentStatus(status: string): Payment["status"] {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "in_process":
    case "authorized":
      return "IN_PROCESS";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGED_BACK";
    case "expired":
      return "EXPIRED";
    case "pending":
      return "PENDING";
    default:
      return "FAILED";
  }
}

export function validateProviderPaymentAgainstOrder(params: {
  payment: MpPayment;
  order: Pick<Order, "id" | "totalCents" | "currency">;
  env: { production: boolean; collectorId: string | null };
}): { ok: true } | { ok: false; reason: string } {
  const payment = params.payment;
  if (payment.external_reference !== params.order.id) {
    return { ok: false, reason: "external_reference_divergente" };
  }
  const amountCents = Math.round(payment.transaction_amount * 100);
  if (amountCents !== params.order.totalCents) {
    return { ok: false, reason: "valor_divergente" };
  }
  if (payment.currency_id !== params.order.currency) {
    return { ok: false, reason: "moeda_divergente" };
  }
  if (params.env.collectorId && String(payment.collector_id ?? "") !== params.env.collectorId) {
    return { ok: false, reason: "conta_recebedora_divergente" };
  }
  if (payment.live_mode !== null && payment.live_mode !== undefined) {
    if (params.env.production && !payment.live_mode) {
      return { ok: false, reason: "ambiente_divergente_sandbox_em_producao" };
    }
    if (!params.env.production && payment.live_mode) {
      return { ok: false, reason: "ambiente_divergente_producao_em_sandbox" };
    }
  }
  return { ok: true };
}
