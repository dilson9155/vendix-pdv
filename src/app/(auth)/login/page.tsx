import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/tenant";
import { LoginForm } from "@/components/auth/login-form";
import { DemoCredentialsHint } from "@/components/auth/demo-credentials-hint";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx) redirect(ctx.isPlatformAdmin && !ctx.tenantId ? "/admin" : "/dashboard");

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Acesso seguro</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Entrar na sua operação</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use o e-mail e a senha cadastrados pelo administrador da empresa.
        </p>
      </div>
      <LoginForm />
      <DemoCredentialsHint />
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Ambiente protegido. Tentativas de acesso são registradas na auditoria.
      </p>
    </div>
  );
}
