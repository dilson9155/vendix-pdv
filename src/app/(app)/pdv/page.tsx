import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Clock3, ReceiptText } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getPosContext } from "@/services/sales.service";
import { getTenantPreferences } from "@/services/settings.service";
import { PdvTerminal } from "@/components/pdv/pdv-terminal";
import { PageHeader } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "PDV" };
export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const ctx = await requirePermission("pdv.operate");
  const [context, preferences] = await Promise.all([
    getPosContext(ctx),
    getTenantPreferences(ctx.tenantId),
  ]);
  const branchId = context.session?.branchId ?? ctx.branchId ?? context.branches[0]?.id ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Ponto de venda"
        description="Busque por nome, SKU ou código de barras. A venda é gravada de forma atômica: estoque, caixa, financeiro e comprovante são atualizados juntos."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/pdv/caixa">
                <Banknote className="size-4" /> Caixa
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/vendas">
                <ReceiptText className="size-4" /> Vendas
              </Link>
            </Button>
          </>
        }
      />

      {!context.session && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Clock3 className="mt-0.5 size-4 shrink-0" />
          <p>
            Nenhum caixa aberto. Abra o caixa abaixo para liberar o registro de vendas. O valor
            inicial é o fundo de troco e entra no saldo esperado do caixa.
          </p>
        </div>
      )}

      <PdvTerminal
        branchId={branchId}
        branches={context.branches}
        session={context.session}
        methods={context.methods}
        maxDiscountPercent={preferences.maxDiscountPercent}
        requireCustomerOnCredit={preferences.requireCustomerOnCredit}
      />

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Leitor de código de barras USB/Bluetooth em modo teclado funciona no campo de busca. A
        impressão do comprovante usa a caixa de impressão do navegador; para impressora térmica
        direta é necessário um agente local, que não faz parte desta entrega.
      </p>
    </div>
  );
}
