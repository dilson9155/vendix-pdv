import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Vendix — Vendeu, organizou, cresceu.",
    template: "%s · Vendix",
  },
  description:
    "Gestão comercial para moda, calçados, cosméticos e variedades: PDV, estoque, financeiro e relatórios em um só lugar.",
  applicationName: "Vendix",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vendix",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B1226",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <Script
          id="vendix-install-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__vendixInstallPrompt=e});window.addEventListener("appinstalled",function(){window.__vendixInstallPrompt=null;window.__vendixInstalled=true});`,
          }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
