import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CircleDollarSign,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { requirePermission } from "@/lib/tenant";
import { getDashboard } from "@/services/dashboard.service";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/date";
import { EmptyState, PageHeader, StatCard, TableShell } from "@/components/page-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requirePermission("dashboard.view");
  const params = await searchParams;
  const data = await getDashboard(ctx, { from: params.from, to: params.to });
  const growth =
    data.previous.revenue > 0
      ? ((data.sales.revenue - data.previous.revenue) / data.previous.revenue) * 100
      : null;
  const maxDaily = Math.max(1, ...data.dailySales.map((day) => day.revenue));

  return (
    <div>
      <PageHeader
        eyebrow="Visão geral"
        title={`Olá, ${ctx.name.split(" ")[0]}`}
        description={`Resultados de ${formatDateBR(data.period.from)} a ${formatDateBR(data.period.to)}. Dados calculados a partir das vendas, do caixa e do financeiro.`}
        actions={
          <>
            <form className="flex flex-wrap items-end gap-2" method="get">
              <div>
                <label htmlFor="from" className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  De
                </label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={data.period.from}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="to" className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Até
                </label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={data.period.to}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Aplicar
              </Button>
            </form>
            <Button asChild size="sm">
              <Link href="/pdv">
                <ShoppingCart className="size-4" /> Nova venda
              </Link>
            </Button>
          </>
        }
      />

      {data.alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.alerts.map((alert, index) => (
            <Link
              key={`${alert.message}-${index}`}
              href={alert.href ?? "#"}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{alert.message}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do período"
          value={formatBRL(data.sales.revenue)}
          hint={
            growth === null
              ? "Sem base anterior comparável"
              : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs. período anterior`
          }
          tone={growth !== null && growth < 0 ? "warning" : "positive"}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Vendas concluídas"
          value={String(data.sales.count)}
          hint={`Ticket médio ${formatBRL(data.sales.averageTicket)}`}
          icon={<ShoppingBag className="size-4" />}
        />
        <StatCard
          label="Hoje"
          value={formatBRL(data.today.revenue)}
          hint={`${data.today.count} venda(s) hoje`}
          icon={<CircleDollarSign className="size-4" />}
        />
        <StatCard
          label="Caixa"
          value={data.cash.open ? formatBRL(data.cash.expectedCash) : "Fechado"}
          hint={
            data.cash.open
              ? `${data.cash.terminalName} · aberto em ${formatDateBR(data.cash.openedAt)}`
              : "Abra o caixa para iniciar o PDV"
          }
          tone={data.cash.open ? "positive" : "warning"}
          icon={<Banknote className="size-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Faturamento por dia</h2>
              <p className="text-xs text-muted-foreground">Vendas concluídas, sem vendas canceladas.</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {data.sales.returns > 0 ? `Devoluções: ${formatBRL(data.sales.returns)}` : "Sem devoluções"}
            </span>
          </div>
          {data.dailySales.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nenhuma venda no período"
                description="Registre a primeira venda no PDV para acompanhar o faturamento diário."
                action={
                  <Button asChild size="sm">
                    <Link href="/pdv">Abrir PDV</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-5 flex h-52 items-end gap-1.5 overflow-x-auto pb-1">
              {data.dailySales.map((day) => (
                <div key={day.date} className="group flex min-w-6 flex-1 flex-col items-center gap-1">
                  <span className="hidden text-[9px] font-medium text-muted-foreground group-hover:block">
                    {formatBRL(day.revenue)}
                  </span>
                  <div
                    className="w-full max-w-10 rounded-t bg-gradient-to-t from-violet-600 to-fuchsia-400 transition group-hover:opacity-80"
                    style={{ height: `${Math.max(4, (day.revenue / maxDaily) * 160)}px` }}
                    title={`${day.date}: ${formatBRL(day.revenue)} em ${day.count} venda(s)`}
                  />
                  <span className="text-[9px] text-muted-foreground">{day.date.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Formas de pagamento</h2>
          <p className="text-xs text-muted-foreground">Recebimentos confirmados no período.</p>
          {data.paymentMix.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Sem recebimentos no período.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.paymentMix.map((item) => (
                <div key={item.kind}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBRL(item.amount)} · {item.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                      style={{ width: `${Math.max(2, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Produtos que mais faturaram</h2>
            <Link href="/relatorios/vendas" className="text-xs font-medium text-primary hover:underline">
              Ver relatório
            </Link>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Sem itens vendidos no período.</p>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Qtd.</th>
                  <th className="num">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, index) => (
                  <tr key={`${product.sku}-${index}`}>
                    <td>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                    </td>
                    <td className="num">{product.quantity.toLocaleString("pt-BR")}</td>
                    <td className="num font-medium">{formatBRL(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="size-4 text-primary" /> Financeiro em aberto
              </h2>
              <Link href="/financeiro" className="text-xs font-medium text-primary hover:underline">
                Abrir
              </Link>
            </div>
            {data.finance ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-[11px] text-muted-foreground">A pagar</dt>
                  <dd className="mt-0.5 text-lg font-semibold">{formatBRL(data.finance.payablesOpen)}</dd>
                  {data.finance.payablesOverdue > 0 && (
                    <dd className="text-[11px] font-medium text-red-600">
                      Vencido: {formatBRL(data.finance.payablesOverdue)}
                    </dd>
                  )}
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-[11px] text-muted-foreground">A receber</dt>
                  <dd className="mt-0.5 text-lg font-semibold">{formatBRL(data.finance.receivablesOpen)}</dd>
                  {data.finance.receivablesOverdue > 0 && (
                    <dd className="text-[11px] font-medium text-red-600">
                      Vencido: {formatBRL(data.finance.receivablesOverdue)}
                    </dd>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Saldo em contas</span>
                  <span className="font-semibold">{formatBRL(data.finance.balance)}</span>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Seu perfil não possui permissão para visualizar o financeiro.
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="size-4 text-primary" /> Estoque
              </h2>
              <Link href="/estoque" className="text-xs font-medium text-primary hover:underline">
                Abrir
              </Link>
            </div>
            {data.stock ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Itens ativos</p>
                    <p className="text-lg font-semibold">{data.stock.items}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Valor a custo</p>
                    <p className="text-lg font-semibold">{formatBRL(data.stock.value)}</p>
                  </div>
                </div>
                {data.stock.lowItems.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t pt-2 text-xs">
                    {data.stock.lowItems.map((item) => (
                      <li key={`${item.sku}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 font-medium text-amber-700">
                          {item.quantity} / mín. {item.minStock}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700">
                    <ArrowUpRight className="size-3.5" /> Nenhum item abaixo do mínimo.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Seu perfil não possui permissão para visualizar o estoque.
              </p>
            )}
          </section>
        </div>
      </div>

      {data.previous.revenue > 0 && (
        <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
          {data.sales.revenue >= data.previous.revenue ? (
            <ArrowUpRight className="size-3.5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="size-3.5 text-red-600" />
          )}
          Período anterior comparável: {formatBRL(data.previous.revenue)} em {data.previous.count} venda(s).
        </p>
      )}
    </div>
  );
}
