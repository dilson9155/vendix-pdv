import Link from "next/link";
import { BarChart3, Boxes, Lock, ShieldCheck, ShoppingCart, Sparkles } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/install-app-button";

const HIGHLIGHTS = [
  {
    icon: ShoppingCart,
    title: "PDV que não trava",
    description: "Venda com leitor, pagamentos divididos e cupom no WhatsApp.",
  },
  {
    icon: Boxes,
    title: "Estoque sob controle",
    description: "Saldo por unidade, inventário e alertas de reposição.",
  },
  {
    icon: BarChart3,
    title: "Relatórios em PDF",
    description: "Vendas, estoque, financeiro e DRE prontos para imprimir.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel institucional */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-28 -top-28 size-[28rem] rounded-full bg-violet-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-coral-500/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-black text-white shadow-lg shadow-violet-900/40">
            V
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold tracking-tight">Vendix</span>
            <span className="block text-[11px] text-sidebar-foreground/55">
              Vendeu, organizou, cresceu.
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/80">
            <Sparkles className="size-3.5 text-violet-300" /> Gestão comercial completa
          </span>
          <h2 className="mt-5 text-[2.15rem] font-semibold leading-[1.15] tracking-tight">
            Toda a operação da loja em uma única tela.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/65">
            PDV, estoque, crediário e financeiro conectados. Cada empresa acessa apenas os
            próprios dados, com permissões por perfil e auditoria de tudo.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-violet-200">
                  <item.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block text-xs leading-relaxed text-sidebar-foreground/60">
                    {item.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] text-sidebar-foreground/45">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Dados isolados por empresa
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" /> Conexão criptografada
          </span>
        </div>
      </aside>

      {/* Formulário */}
      <main className="relative flex min-h-dvh flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-base font-black text-white shadow-md shadow-violet-900/30">
              V
            </span>
            <span className="text-base font-semibold tracking-tight">Vendix</span>
          </Link>
          <InstallAppButton size="sm" variant="outline" label="Instalar app" />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Vendix · software de gestão comercial · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}
