import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getReceiptData, getSale } from "@/services/sales.service";
import { ReceiptView } from "@/components/receipt-view";
import { PrintControls } from "@/components/print-controls";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Comprovante" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const ctx = await requirePermission("sales.view");
  const { id } = await params;
  const query = await searchParams;
  const sale = await getSale(ctx, id);
  if (!sale) notFound();
  const receipt = await getReceiptData(ctx, id);
  if (!receipt) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/vendas/${id}`}>
            <ArrowLeft className="size-4" /> Voltar à venda
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">Comprovante {sale.documentNumber}</p>
      </div>
      <div className="rounded-xl border bg-white p-2 shadow-sm print:border-0 print:shadow-none">
        <ReceiptView receipt={receipt} />
      </div>
      <div className="mt-4">
        <PrintControls autoPrint={query.print === "1"} />
      </div>
    </div>
  );
}
