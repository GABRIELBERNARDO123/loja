import { z } from "zod";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { sha256 } from "@/lib/security/crypto";
import { fetchPayment, verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { processProviderPayment } from "@/lib/payments/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    action: z.string().optional(),
    data: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
  })
  .passthrough();

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) {
    return jsonError("Webhook não configurado.", 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) return jsonError("Payload muito grande.", 413);

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return jsonError("Payload muito grande.", 413);

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(rawBody));
  } catch {
    return jsonError("Payload inválido.", 400);
  }

  const url = new URL(request.url);
  const dataIdFromQuery = url.searchParams.get("data.id");
  const dataId = dataIdFromQuery ?? (parsed.data?.id !== undefined ? String(parsed.data.id) : null);

  const signatureValid = verifyWebhookSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: env.MERCADO_PAGO_WEBHOOK_SECRET,
  });

  if (!signatureValid) {
    console.warn("Webhook Mercado Pago recusado: assinatura inválida.");
    return jsonError("Assinatura inválida.", 401);
  }

  if (parsed.type && parsed.type !== "payment") {
    return Response.json({ ok: true, received: true, ignored: true }, { status: 200 });
  }

  if (!dataId || !/^\d{1,30}$/.test(dataId)) {
    return jsonError("Identificador de pagamento inválido.", 400);
  }

  try {
    const providerPayment = await fetchPayment(dataId);
    const result = await processProviderPayment({
      payment: providerPayment,
      signatureValid: true,
      payloadHash: sha256(rawBody),
    });

    return Response.json(
      { ok: true, received: true, result: result.result },
      { status: 200 },
    );
  } catch (error) {
    console.error("Falha ao processar webhook Mercado Pago", error instanceof Error ? error.name : "erro");
    return jsonError("Falha temporária ao processar notificação.", 502);
  }
}
