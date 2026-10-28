import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Vendix — Gestão comercial",
    short_name: "Vendix",
    description:
      "PDV, estoque, financeiro e relatórios para lojas de moda, calçados, cosméticos e variedades.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0F172A",
    theme_color: "#6D28D9",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "finance", "productivity", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "PDV", short_name: "PDV", url: "/pdv" },
      { name: "Dashboard", short_name: "Dashboard", url: "/dashboard" },
    ],
  };
}
