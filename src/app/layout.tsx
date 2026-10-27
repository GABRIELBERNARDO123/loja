import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { getStoreSettings } from "@/lib/settings";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let storeName = "Vértice Digital";
  let tagline = "Conhecimento que destrava resultados";
  try {
    const settings = await getStoreSettings();
    storeName = settings.storeName;
    tagline = settings.tagline;
  } catch {
    // During a cold build without database access, fall back to safe defaults.
  }

  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: {
      default: `${storeName} — Produtos digitais premium`,
      template: `%s — ${storeName}`,
    },
    description: tagline,
    applicationName: storeName,
    authors: [{ name: storeName }],
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: storeName,
      title: `${storeName} — Produtos digitais premium`,
      description: tagline,
    },
    twitter: {
      card: "summary_large_image",
      title: storeName,
      description: tagline,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function safeHex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let primaryColor = "#f4315b";
  let accentColor = "#8b5cf6";
  try {
    const settings = await getStoreSettings();
    primaryColor = safeHex(settings.primaryColor, primaryColor);
    accentColor = safeHex(settings.accentColor, accentColor);
  } catch {
    // Keep defaults; pages that need DB will surface a clear error.
  }

  const rgb = (hex: string) => {
    const value = hex.replace("#", "");
    return `${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}`;
  };

  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body
        className="min-h-screen bg-ink-950 font-sans antialiased"
        style={
          {
            "--brand": primaryColor,
            "--brand-rgb": rgb(primaryColor),
            "--accent": accentColor,
            "--accent-rgb": rgb(accentColor),
          } as React.CSSProperties
        }
      >
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Pular para o conteúdo
        </a>
        {children}
        <Providers />
      </body>
    </html>
  );
}
