import { createHmac } from "node:crypto";
import { File as NodeFile } from "node:buffer";
import { describe, expect, it } from "vitest";
import { hashPassword, passwordPolicyIssues, verifyPassword } from "@/lib/security/password";
import { verifyWebhookSignature, validateProviderPaymentAgainstOrder, type MpPayment } from "@/lib/payments/mercadopago";
import { normalizeFilename, safeContentDisposition, validateUploadedFile } from "@/lib/storage";

function signature(manifest: string, secret = "test-webhook-secret"): string {
  const ts = "1700000000";
  const v1 = createHmac("sha256", secret).update(`id:123;request-id:req-1;ts:${ts};`).digest("hex");
  void manifest;
  return `ts=${ts},v1=${v1}`;
}

function providerPayment(overrides: Partial<MpPayment> = {}): MpPayment {
  return {
    id: "123",
    status: "approved",
    status_detail: "accredited",
    transaction_amount: 14.9,
    currency_id: "BRL",
    external_reference: "order-1",
    collector_id: "999",
    live_mode: false,
    payment_method_id: "pix",
    ...overrides,
  };
}

describe("senhas", () => {
  it("gera hash Argon2id e valida a senha correta", async () => {
    const hash = await hashPassword("SenhaForte#2026");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "SenhaForte#2026")).toBe(true);
    expect(await verifyPassword(hash, "SenhaErrada#2026")).toBe(false);
  });

  it("exige política mínima de senha", () => {
    expect(passwordPolicyIssues("fraca").length).toBeGreaterThan(0);
    expect(passwordPolicyIssues("SenhaForte#2026")).toEqual([]);
  });
});

describe("assinatura de webhook", () => {
  it("aceita assinatura HMAC válida", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: signature(""),
        requestId: "req-1",
        dataId: "123",
        secret: "test-webhook-secret",
      }),
    ).toBe(true);
  });

  it("recusa assinatura com segredo errado", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: signature("", "outro-segredo"),
        requestId: "req-1",
        dataId: "123",
        secret: "test-webhook-secret",
      }),
    ).toBe(false);
  });

  it("recusa assinatura quando o id é alterado", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: signature(""),
        requestId: "req-1",
        dataId: "999",
        secret: "test-webhook-secret",
      }),
    ).toBe(false);
  });

  it("recusa quando o segredo não está configurado", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: signature(""),
        requestId: "req-1",
        dataId: "123",
        secret: "",
      }),
    ).toBe(false);
  });
});

describe("validação de pagamento contra pedido", () => {
  const order = { id: "order-1", totalCents: 1490, currency: "BRL" };

  it("aceita cobrança com valor, moeda, referência e ambiente corretos", () => {
    expect(
      validateProviderPaymentAgainstOrder({
        payment: providerPayment(),
        order,
        env: { production: false, collectorId: "999" },
      }),
    ).toEqual({ ok: true });
  });

  it("rejeita valor manipulado para zero", () => {
    const result = validateProviderPaymentAgainstOrder({
      payment: providerPayment({ transaction_amount: 0 }),
      order,
      env: { production: false, collectorId: "999" },
    });
    expect(result).toEqual({ ok: false, reason: "valor_divergente" });
  });

  it("rejeita moeda diferente", () => {
    const result = validateProviderPaymentAgainstOrder({
      payment: providerPayment({ currency_id: "USD" }),
      order,
      env: { production: false, collectorId: null },
    });
    expect(result).toEqual({ ok: false, reason: "moeda_divergente" });
  });

  it("rejeita referência de outro pedido", () => {
    const result = validateProviderPaymentAgainstOrder({
      payment: providerPayment({ external_reference: "order-2" }),
      order,
      env: { production: false, collectorId: null },
    });
    expect(result).toEqual({ ok: false, reason: "external_reference_divergente" });
  });

  it("rejeita conta recebedora divergente", () => {
    const result = validateProviderPaymentAgainstOrder({
      payment: providerPayment(),
      order,
      env: { production: false, collectorId: "111" },
    });
    expect(result).toEqual({ ok: false, reason: "conta_recebedora_divergente" });
  });

  it("rejeita pagamento live em ambiente sandbox", () => {
    const result = validateProviderPaymentAgainstOrder({
      payment: providerPayment({ live_mode: true }),
      order,
      env: { production: false, collectorId: null },
    });
    expect(result).toEqual({ ok: false, reason: "ambiente_divergente_producao_em_sandbox" });
  });
});

describe("validação de upload", () => {
  function file(content: string, name: string, type: string): File {
    return new NodeFile([Buffer.from(content)], name, { type }) as unknown as File;
  }

  it("aceita PDF com assinatura correta", async () => {
    const result = await validateUploadedFile(file("%PDF-1.4\nconteudo", "arquivo.pdf", "application/pdf"));
    expect(result.extension).toBe("pdf");
    expect(result.originalName).toBe("arquivo.pdf");
  });

  it("recusa arquivo com extensão permitida e conteúdo falso", async () => {
    await expect(
      validateUploadedFile(file("<script>alert(1)</script>", "malicioso.pdf", "application/pdf")),
    ).rejects.toThrow("não corresponde");
  });

  it("recusa extensão não permitida", async () => {
    await expect(
      validateUploadedFile(file("MZ", "programa.exe", "application/octet-stream")),
    ).rejects.toThrow("Formato não permitido");
  });

  it("recusa arquivo vazio", async () => {
    await expect(
      validateUploadedFile(new NodeFile([], "vazio.txt", { type: "text/plain" }) as unknown as File),
    ).rejects.toThrow("Arquivo vazio");
  });

  it("normaliza nome e gera Content-Disposition seguro", () => {
    expect(normalizeFilename("../../relatório final.pdf")).toBe("relatório final.pdf");
    const header = safeContentDisposition("relatório.pdf");
    expect(header).toContain("attachment;");
    expect(header).toContain("filename*=UTF-8''relat%C3%B3rio.pdf");
  });
});
