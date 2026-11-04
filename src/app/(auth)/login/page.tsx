import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/tenant";
import { LoginForm } from "@/components/auth/login-form";
import { DemoCredentialsHint } from "@/components/auth/demo-credentials-hint";
import { VendixMark } from "@/components/brand/vendix-mark";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx) redirect(ctx.isPlatformAdmin && !ctx.tenantId ? "/admin" : "/dashboard");

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500" />
      <VendixMark className="mb-5 size-12 shadow-lg shadow-slate-900/15" />
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="size-3.5" /> Acesso seguro
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar na sua operação</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use o e-mail e a senha cadastrados pelo administrador da empresa.
        </p>
      </div>

      <LoginForm />

      <DemoCredentialsHint />

      <p className="mt-7 border-t pt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Ambiente protegido. Tentativas de acesso são registradas na auditoria.
      </p>
    </div>
  );
}
