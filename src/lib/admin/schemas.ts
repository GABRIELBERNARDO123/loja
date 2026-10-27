import { z } from "zod";
import { parseBRLToCents, slugify } from "@/lib/format";
import { normalizeCouponCode } from "@/lib/coupons";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

function safeHttpOrLocal(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(600)
  .optional()
  .default("")
  .refine(safeHttpOrLocal, "Informe uma URL HTTPS válida ou faça upload da imagem.");

export const productSchema = z
  .object({
    name: z.string().trim().min(3).max(140),
    slug: z.string().trim().max(90).optional().default(""),
    shortDescription: z.string().trim().min(10).max(260),
    description: z.string().trim().min(20).max(30000),
    price: z.string().trim().min(1).max(20),
    compareAt: z.string().trim().max(20).optional().default(""),
    categoryId: z.string().trim().max(40).optional().default(""),
    coverImageUrl: optionalUrl,
    previewUrl: optionalUrl,
    fileFormat: z.string().trim().min(1).max(40),
    compatibility: optionalText(300),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
    downloadLimit: z.coerce.number().int().min(1).max(1000).optional().default(10),
    downloadExpiryDays: z.coerce.number().int().min(1).max(3650).optional().default(365),
    isActive: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const price = parseBRLToCents(data.price);
    if (price <= 0 || price > 100_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Informe um preço válido maior que zero." });
    }
    if (data.compareAt) {
      const compare = parseBRLToCents(data.compareAt);
      if (compare <= price) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["compareAt"], message: "O preço comparativo deve ser maior que o preço atual." });
      }
    }
    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slug"], message: "Use apenas letras minúsculas, números e hífens." });
    }
  })
  .transform((data) => {
    const slug = (data.slug ? slugify(data.slug) : slugify(data.name)) || `produto-${Date.now()}`;
    return {
      ...data,
      slug,
      priceCents: parseBRLToCents(data.price),
      compareAtCents: data.compareAt ? parseBRLToCents(data.compareAt) : null,
      categoryId: data.categoryId || null,
      coverImageUrl: data.coverImageUrl || null,
      previewUrl: data.previewUrl || null,
      compatibility: data.compatibility || null,
    };
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const couponSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    description: z.string().trim().max(200).optional().default(""),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.string().trim().min(1).max(20),
    minSubtotal: z.string().trim().max(20).optional().default(""),
    maxDiscount: z.string().trim().max(20).optional().default(""),
    startsAt: z.string().trim().max(40).optional().default(""),
    endsAt: z.string().trim().max(40).optional().default(""),
    maxRedemptions: z.string().trim().max(20).optional().default(""),
    perUserLimit: z.coerce.number().int().min(1).max(100).optional().default(1),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const numericValue = data.type === "PERCENT" ? Number.parseInt(data.value, 10) : parseBRLToCents(data.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Valor do cupom inválido." });
    }
    if (data.type === "PERCENT" && numericValue > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "O percentual deve ser no máximo 100." });
    }
    if (data.startsAt && Number.isNaN(new Date(data.startsAt).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "Data inicial inválida." });
    }
    if (data.endsAt && Number.isNaN(new Date(data.endsAt).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Data final inválida." });
    }
    if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "A data final deve ser posterior à inicial." });
    }
    if (data.maxRedemptions && (!/^\d+$/.test(data.maxRedemptions) || Number(data.maxRedemptions) < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxRedemptions"], message: "Limite de usos inválido." });
    }
  })
  .transform((data) => ({
    ...data,
    code: normalizeCouponCode(data.code),
    numericValue: data.type === "PERCENT" ? Number.parseInt(data.value, 10) : parseBRLToCents(data.value),
    minSubtotalCents: data.minSubtotal ? parseBRLToCents(data.minSubtotal) : 0,
    maxDiscountCents: data.maxDiscount ? parseBRLToCents(data.maxDiscount) : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    maxRedemptions: data.maxRedemptions ? Number(data.maxRedemptions) : null,
  }));

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .optional()
  .default("")
  .refine((value) => !value || z.string().email().safeParse(value).success, "E-mail inválido.");

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(160),
  logoUrl: optionalUrl,
  supportEmail: optionalEmail,
  whatsapp: z.string().trim().max(30).optional().default(""),
  instagram: z.string().trim().max(120).optional().default(""),
  legalName: z.string().trim().max(160).optional().default(""),
  document: z.string().trim().max(30).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(40).optional().default(""),
  zip: z.string().trim().max(20).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  termsContent: z.string().max(100000),
  privacyContent: z.string().max(100000),
  refundContent: z.string().max(100000),
  licenseContent: z.string().max(100000),
  contactContent: z.string().max(100000),
  defaultDownloadLimit: z.coerce.number().int().min(1).max(1000),
  defaultExpiryDays: z.coerce.number().int().min(1).max(3650),
  pixExpirationMinutes: z.coerce.number().int().min(5).max(1440),
});
