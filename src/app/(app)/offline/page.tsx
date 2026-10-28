"use client";

import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
        <WifiOff className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Sem conexão</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
      </p>
      <Button className="mt-5" onClick={() => router.refresh()}>
        Tentar novamente
      </Button>
    </div>
  );
}
