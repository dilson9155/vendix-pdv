import type { Metadata, Viewport } from "next";
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
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#6D28D9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
