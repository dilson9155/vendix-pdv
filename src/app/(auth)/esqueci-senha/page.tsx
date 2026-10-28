import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci a senha" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Recuperação</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seu e-mail. Por segurança, a resposta é a mesma exista ou não a conta.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
