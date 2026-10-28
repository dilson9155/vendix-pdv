"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintControls({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-2">
      <Button type="button" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Imprimir
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => window.close()}>
        Fechar
      </Button>
      <p className="w-full text-center text-[11px] text-muted-foreground">
        A impressão usa a caixa de diálogo do navegador. Selecione o tamanho 58 mm ou 80 mm.
      </p>
    </div>
  );
}
