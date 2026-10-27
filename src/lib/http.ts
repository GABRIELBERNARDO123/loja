import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CsrfError } from "@/lib/security/csrf";
import { RateLimitError } from "@/lib/security/rate-limit";
import { OrderError } from "@/lib/orders";
import { CouponError } from "@/lib/coupons";
import { StorageError } from "@/lib/storage";
import { PaymentProviderError } from "@/lib/payments/mercadopago";
import { UnauthorizedError } from "@/lib/auth/guards";
import { DownloadError } from "@/lib/downloads";
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...(data as object) }, { status });
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const fields = error.flatten().fieldErrors;
    return jsonError("Dados inválidos. Revise os campos.", 422, { fields });
  }
  if (error instanceof CsrfError) return jsonError(error.message, 403);
  if (error instanceof UnauthorizedError) return jsonError(error.message, error.status);
  if (error instanceof RateLimitError) {
    return jsonError(error.message, 429, { retryAfter: error.retryAfterSeconds });
  }
  if (error instanceof OrderError || error instanceof CouponError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof DownloadError) return jsonError(error.message, error.status);
  if (error instanceof StorageError) return jsonError(error.message, 400);
  if (error instanceof PaymentProviderError) return jsonError(error.message, error.status);
  if (error instanceof AppError) return jsonError(error.message, error.status);

  if (error instanceof Error) {
    if (error.name === "PaymentNotConfiguredError") {
      return jsonError("Pagamento Pix ainda não configurado. Consulte o administrador da loja.", 503);
    }
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("Erro não tratado em rota:", error.name);
  } else {
    console.error("Erro não tratado em rota");
  }
  return jsonError("Não foi possível concluir a operação. Tente novamente.", 500);
}

export async function readJson(request: Request, maxBytes = 100_000): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) throw new AppError("Requisição muito grande.", 413);
  const text = await request.text();
  if (text.length > maxBytes) throw new AppError("Requisição muito grande.", 413);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("Corpo da requisição inválido.", 400);
  }
}

export function safeNextPath(value: string | null | undefined, fallback = "/conta"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}
