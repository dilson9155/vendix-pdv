import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 size-96 rounded-full bg-coral-500/15 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-black text-white shadow-lg shadow-violet-900/40">
            V
          </span>
          <span className="text-lg font-semibold tracking-tight">Vendix</span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Vendeu, organizou, cresceu.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/65">
            PDV, estoque, financeiro e relatórios trabalhando juntos. Uma operação simples
            para lojas de moda, calçados, cosméticos e variedades.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground/80">
            <li>• Venda com leitor de código de barras e pagamentos divididos</li>
            <li>• Caixa, contas a pagar e receber com trilha de auditoria</li>
            <li>• DRE gerencial e indicadores em tempo real</li>
            <li>• Multiempresa com isolamento de dados por unidade</li>
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">
          Vendix · software de gestão comercial · {new Date().getFullYear()}
        </p>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
