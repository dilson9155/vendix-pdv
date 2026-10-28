import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/tenant";
import { getSale } from "@/services/sales.service";
import { formatDateBR, formatDateTimeBR, formatDocument } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatusBadge, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";
import { SaleActions, ShareReceiptBox } from "@/components/forms/sale-actions";

export const metadata: Metadata = { title: "Detalhe da venda" };
export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission("sales.view");
  const { id } = await params;
  const sale = await getSale(ctx, id);
  if (!sale) notFound();

  const returnedByItem = new Map<string, number>();
  for (const saleReturn of sale.returns) {
    for (const item of saleReturn.items) {
      returnedByItem.set(
        item.saleItemId,
        (returnedByItem.get(item.saleItemId) ?? 0) + Number(item.quantity)
      );
    }
  }
  const returnItems = sale.items.map((item) => ({
    id: item.id,
    description: item.description,
    sku: item.sku,
    available: Math.max(0, Number(item.quantity) - (returnedByItem.get(item.id) ?? 0)),
    unitPrice: Number(item.total) / Number(item.quantity || 1),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Venda"
        title={`Comprovante ${sale.documentNumber}`}
        description={`${formatDateTimeBR(sale.createdAt)} · ${sale.branch.name} · operador ${sale.operator.name}`}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/vendas">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/vendas/${sale.id}/comprovante`} target="_blank">
                <ReceiptText className="size-4" /> Abrir comprovante
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Resumo</h2>
                <p className="text-xs text-muted-foreground">
                  Cliente: {sale.customer?.name ?? "Consumidor final"}
                  {sale.customer?.document ? ` · ${formatDocument(sale.customer.document)}` : ""}
                </p>
              </div>
              <StatusBadge status={sale.status} />
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[11px] text-muted-foreground">Subtotal</dt>
                <dd className="text-sm font-medium tabular-nums">{formatBRL(Number(sale.subtotal))}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Desconto</dt>
                <dd className="text-sm font-medium tabular-nums">{formatBRL(Number(sale.discount))}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Total</dt>
                <dd className="text-base font-semibold tabular-nums">{formatBRL(Number(sale.total))}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Pago / troco</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {formatBRL(Number(sale.paidTotal))}
                  {Number(sale.changeAmount) > 0 ? ` · troco ${formatBRL(Number(sale.changeAmount))}` : ""}
                </dd>
              </div>
            </dl>
            {sale.notes && (
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{sale.notes}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Itens</h2>
            </div>
            <TableShell caption="Itens da venda">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qtd.</th>
                  <th className="num">Unitário</th>
                  <th className="num">Desconto</th>
                  <th className="num">Total</th>
                  <th className="num">Devolvido</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.sku}
                        {item.variant ? ` · ${[item.variant.color, item.variant.size].filter(Boolean).join(" / ")}` : ""}
                      </p>
                    </td>
                    <td className="num">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                    <td className="num">{formatBRL(Number(item.unitPrice))}</td>
                    <td className="num">{formatBRL(Number(item.discount))}</td>
                    <td className="num font-medium">{formatBRL(Number(item.total))}</td>
                    <td className="num">{returnedByItem.get(item.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          <section className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Pagamentos</h2>
            </div>
            <TableShell caption="Pagamentos da venda">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Tipo</th>
                  <th className="num">Parcelas</th>
                  <th className="num">Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium">{payment.methodName}</td>
                    <td>{payment.methodKind}</td>
                    <td className="num">{payment.installments}x</td>
                    <td className="num font-medium">{formatBRL(Number(payment.amount))}</td>
                    <td>
                      <StatusBadge status={payment.status === "CONFIRMADO" ? "ATIVO" : payment.status} />
                      {payment.status === "CONFIRMADO" && (
                        <span className="ml-1 text-[10px] text-muted-foreground">confirmado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          {sale.returns.length > 0 && (
            <section className="rounded-xl border bg-card shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Devoluções</h2>
              </div>
              <div className="divide-y">
                {sale.returns.map((saleReturn) => (
                  <div key={saleReturn.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {formatDateTimeBR(saleReturn.createdAt)} · {saleReturn.user.name}
                      </p>
                      <span className="font-semibold tabular-nums">{formatBRL(Number(saleReturn.total))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{saleReturn.reason}</p>
                    <ul className="mt-1 text-[11px] text-muted-foreground">
                      {saleReturn.items.map((item) => (
                        <li key={item.id}>
                          {Number(item.quantity)}× {item.saleItem?.description ?? "Item"} — {formatBRL(Number(item.total))}
                          {item.restock ? " · reposto no estoque" : " · sem reposição"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <SaleActions
            saleId={sale.id}
            status={sale.status}
            canCancel={hasPermission(ctx, "sales.cancel")}
            canReturn={hasPermission(ctx, "sales.return")}
            items={returnItems}
          />

          {hasPermission(ctx, "whatsapp.send") && (
            <ShareReceiptBox
              saleId={sale.id}
              defaultPhone={sale.customer?.whatsapp ?? sale.customer?.phone ?? ""}
            />
          )}

          {sale.receivables.length > 0 && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Contas a receber geradas</h2>
              <ul className="mt-2 divide-y rounded-lg border">
                {sale.receivables.map((receivable) => {
                  const received = receivable.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                  return (
                    <li key={receivable.id} className="px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{receivable.description}</span>
                        <span className="tabular-nums">
                          {formatBRL(Number(receivable.value) - received)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Vence {formatDateBR(receivable.dueDate)} · <StatusBadge status={receivable.status} />
                      </p>
                    </li>
                  );
                })}
              </ul>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/financeiro/contas-a-receber">Abrir contas a receber</Link>
              </Button>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Rastreabilidade</h2>
            <ul className="mt-2 space-y-1.5">
              <li>• Venda gravada uma única vez; chave de idempotência evita duplicidade.</li>
              <li>• Estoque descontado uma vez, no ato da venda.</li>
              <li>• Cancelamentos e devoluções geram estornos vinculados, sem apagar o histórico.</li>
              <li>• O comprovante público expira e pode ser revogado.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
