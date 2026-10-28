"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/app/actions/auth.actions";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await forgotPasswordAction({ email: String(data.get("email") ?? "") });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSent(true);
          setMessage(result.data?.message ?? "Verifique seu e-mail.");
          setDevLink(result.data?.devLink ?? null);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail cadastrado</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{message}</p>
          {devLink && (
            <p className="mt-2 break-all text-xs">
              Link de desenvolvimento:{" "}
              <Link href={devLink} className="font-semibold underline">
                abrir redefinição
              </Link>
            </p>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending || sent}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {sent ? "Solicitação registrada" : "Enviar instruções"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
