"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions/auth.actions";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await loginAction({
            email: String(data.get("email") ?? ""),
            password: String(data.get("password") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.replace("/dashboard");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@empresa.com.br"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
            Esqueci a senha
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Entrar no Vendix
      </Button>
    </form>
  );
}
