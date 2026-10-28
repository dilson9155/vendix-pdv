import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Acesso negado" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-700">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Acesso negado</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Sua conta não possui permissão para acessar esta área. Se você acredita que isso é um erro, solicite ao
        administrador do seu perfil de acesso.
      </p>
      <Button asChild className="mt-5" size="sm">
        <Link href="/dashboard">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
