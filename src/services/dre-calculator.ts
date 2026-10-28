import { dec, round2, sumValues, toNumber } from "@/lib/money";

// Fórmulas do DRE gerencial (documentadas em docs/03-dre.md):
//   Receita bruta ........ vendas concluídas/parcialmente devolvidas no período
//                          (o valor já é líquido de desconto concedido no item)
//   Deduções ............. devoluções registradas no período
//   Receita líquida ...... receita bruta - deduções
//   CMV .................. custo dos itens vendidos - custo dos itens devolvidos
//   Lucro bruto .......... receita líquida - CMV
//   Despesas operacionais  contas a pagar por competência (natureza DESPESA,
//                          exceto canceladas) + lançamentos manuais de despesa
//   Resultado operacional  lucro bruto - despesas operacionais
//   Outras receitas ...... lançamentos manuais de receita (não vendas)
//   Resultado líquido .... resultado operacional + outras receitas
//
// Compras de estoque e contas de natureza CUSTO/ATIVO não entram como despesa:
// o custo é reconhecido via CMV, evitando dupla contagem.

export type DreExpenseLine = { code: string; name: string; amount: number };

export type DreInput = {
  grossRevenue: number | string;
  returns: number | string;
  cogs: number | string;
  expenses: DreExpenseLine[];
  otherRevenues?: number | string;
  discounts?: number | string;
};

export type DreResult = {
  grossRevenue: number;
  discounts: number;
  returns: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: DreExpenseLine[];
  totalExpenses: number;
  operatingResult: number;
  otherRevenues: number;
  netResult: number;
  netMargin: number;
  breakEvenRevenue: number;
};

export function calculateDre(input: DreInput): DreResult {
  const grossRevenue = dec(input.grossRevenue);
  const returns = dec(input.returns);
  const cogs = dec(input.cogs);
  const otherRevenues = dec(input.otherRevenues);
  const discounts = dec(input.discounts);

  const netRevenue = grossRevenue.minus(returns);
  const grossProfit = netRevenue.minus(cogs);
  const expenses = input.expenses
    .map((line) => ({ ...line, amount: round2(line.amount).toNumber() }))
    .filter((line) => line.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
  const totalExpenses = sumValues(expenses.map((line) => line.amount));
  const operatingResult = grossProfit.minus(totalExpenses);
  const netResult = operatingResult.plus(otherRevenues);

  // Ponto de equilíbrio contábil simplificado: despesas / margem de contribuição
  // (margem bruta sobre a receita líquida). Se a margem for <= 0, não há ponto
  // de equilíbrio calculável e devolvemos 0.
  const grossMarginRatio = netRevenue.isZero() ? dec(0) : grossProfit.dividedBy(netRevenue);
  const breakEvenRevenue = grossMarginRatio.greaterThan(0)
    ? totalExpenses.dividedBy(grossMarginRatio)
    : dec(0);

  return {
    grossRevenue: toNumber(grossRevenue),
    discounts: toNumber(discounts),
    returns: toNumber(returns),
    netRevenue: toNumber(netRevenue),
    cogs: toNumber(cogs),
    grossProfit: toNumber(grossProfit),
    grossMargin:
      netRevenue.isZero() ? 0 : round2(grossProfit.dividedBy(netRevenue).times(100)).toNumber(),
    expenses,
    totalExpenses: toNumber(totalExpenses),
    operatingResult: toNumber(operatingResult),
    otherRevenues: toNumber(otherRevenues),
    netResult: toNumber(netResult),
    netMargin:
      netRevenue.isZero() ? 0 : round2(netResult.dividedBy(netRevenue).times(100)).toNumber(),
    breakEvenRevenue: toNumber(breakEvenRevenue),
  };
}
