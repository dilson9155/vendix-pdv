"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/app/actions/auth.actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Senha redefinida. Entre novamente com a nova senha.
        </div>
        <Button className="w-full" onClick={() => router.replace("/login")}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await resetPasswordAction({
            token,
            password: String(data.get("password") ?? ""),
            confirmPassword: String(data.get("confirmPassword") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(true);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Redefinir senha
      </Button>
    </form>
  );
}
