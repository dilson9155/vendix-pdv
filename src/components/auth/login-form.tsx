"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions/auth.actions";

const LAST_EMAIL_KEY = "vendix:last-email";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Lembra apenas o e-mail (nunca a senha) para agilizar o próximo acesso.
  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (saved && emailRef.current && !emailRef.current.value) {
      emailRef.current.value = saved;
    }
  }, []);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "").trim();
        const password = String(data.get("password") ?? "");
        setError(null);

        if (!email || !password) {
          setError("Informe o e-mail e a senha para continuar.");
          return;
        }

        startTransition(async () => {
          const result = await loginAction({ email, password });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          window.localStorage.setItem(LAST_EMAIL_KEY, email);
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
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            placeholder="voce@empresa.com.br"
            aria-invalid={Boolean(error)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-xs font-medium text-primary hover:underline"
            tabIndex={0}
          >
            Esqueci a senha
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            aria-invalid={Boolean(error)}
            className="h-10 pl-9 pr-10"
            onKeyUp={(event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false)}
            onKeyDown={(event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {capsLock && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <AlertCircle className="size-3.5" /> Caps Lock está ativado.
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <Button type="submit" className="h-10 w-full gap-2" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Entrando..." : "Entrar no Vendix"}
        {!pending && <ArrowRight className="size-4" />}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        Problemas para entrar? Fale com o administrador da sua empresa.
      </p>
    </form>
  );
}
