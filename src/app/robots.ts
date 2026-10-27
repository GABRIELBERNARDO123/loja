import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/conta", "/checkout", "/pedido", "/verificar-2fa", "/redefinir-senha", "/verificar-email"],
      },
    ],
    sitemap: `${publicAppUrl()}/sitemap.xml`,
    host: publicAppUrl(),
  };
}
