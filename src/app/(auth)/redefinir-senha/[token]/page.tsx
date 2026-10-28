import type { Metadata } from "next";
import Link from "next/link";
import { validateResetToken } from "@/services/password.service";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await validateResetToken(token);

  if (!valid) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solicite um novo link de redefinição. Por segurança, cada link pode ser usado uma única vez
          e expira em 30 minutos.
        </p>
        <Link
          href="/esqueci-senha"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Segurança</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Criar nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma senha forte, diferente de senhas usadas em outros serviços.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
