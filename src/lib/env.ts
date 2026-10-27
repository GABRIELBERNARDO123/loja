import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET deve ter ao menos 32 caracteres"),
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY é obrigatória")
    .refine((value) => {
      try {
        return Buffer.from(value, "base64").length === 32;
      } catch {
        return false;
      }
    }, "ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes"),
  STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).default("vercel-blob"),
  LOCAL_STORAGE_DIR: z.string().default(".private-storage"),
  BLOB_READ_WRITE_TOKEN: z.string().optional().default(""),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional().default(""),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional().default(""),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional().default(""),
  MERCADO_PAGO_COLLECTOR_ID: z.string().optional().default(""),
  MERCADO_PAGO_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Loja Digital <nao-responda@example.com>"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;
let cachedSource: Record<string, string | undefined> | null = null;

export function getEnv(): ServerEnv {
  if (cached && cachedSource === process.env) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Configuração de ambiente inválida. Verifique .env.example.\n${messages.join("\n")}`);
  }

  cached = parsed.data;
  cachedSource = process.env;
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function appUrl(): string {
  return getEnv().APP_URL.replace(/\/$/, "");
}

export function paymentsConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET);
}

export function emailConfigured(): boolean {
  return Boolean(getEnv().RESEND_API_KEY);
}
