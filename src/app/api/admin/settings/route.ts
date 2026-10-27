import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { settingsSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ensureStoreSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const input = settingsSchema.parse(await readJson(request, 600_000));
    await ensureStoreSettings();

    const settings = await prisma.storeSettings.update({
      where: { id: "default" },
      data: {
        storeName: input.storeName,
        tagline: input.tagline,
        logoUrl: input.logoUrl || null,
        supportEmail: input.supportEmail,
        whatsapp: input.whatsapp,
        instagram: input.instagram,
        legalName: input.legalName,
        document: input.document,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        phone: input.phone,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        termsContent: input.termsContent,
        privacyContent: input.privacyContent,
        refundContent: input.refundContent,
        licenseContent: input.licenseContent,
        contactContent: input.contactContent,
        defaultDownloadLimit: input.defaultDownloadLimit,
        defaultExpiryDays: input.defaultExpiryDays,
        pixExpirationMinutes: input.pixExpirationMinutes,
      },
    });

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.settings_updated",
      entityType: "store_settings",
      entityId: settings.id,
    });

    return jsonOk({ message: "Configurações salvas." });
  } catch (error) {
    return errorResponse(error);
  }
}
