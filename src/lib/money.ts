import Decimal from "decimal.js";

// Precisão alta para cálculos intermediários; arredondamento comercial (half-up)
// aplicado apenas nas bordas (persistência e exibição).
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export type Numeric = Decimal | string | number | null | undefined;

export function dec(value: Numeric): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  if (value instanceof Decimal) return value;
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

/** Arredonda para 2 casas (half-up) e devolve Decimal. */
export function round2(value: Numeric): Decimal {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Valor pronto para persistir em coluna Decimal(14,2). */
export function money(value: Numeric): string {
  return round2(value).toFixed(2);
}

/** Quantidade pronta para persistir em Decimal(14,3). */
export function qty(value: Numeric): string {
  return dec(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
}

/** Converte para number apenas para exibição/gráficos. Nunca use em cálculos. */
export function toNumber(value: Numeric): number {
  return round2(value).toNumber();
}

export function sumValues(values: Numeric[]): Decimal {
  return values.reduce<Decimal>((acc, value) => acc.plus(dec(value)), new Decimal(0));
}

export function multiply(a: Numeric, b: Numeric): Decimal {
  return round2(dec(a).times(dec(b)));
}

/** Divisão segura: devolve 0 quando o divisor é zero. */
export function safeDivide(a: Numeric, b: Numeric): Decimal {
  const divisor = dec(b);
  if (divisor.isZero()) return new Decimal(0);
  return dec(a).dividedBy(divisor);
}

export function percent(part: Numeric, total: Numeric): number {
  const result = safeDivide(part, total).times(100);
  return result.toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
}

/** Divide um valor em N parcelas com ajuste na última (sem perder centavos). */
export function splitInstallments(total: Numeric, installments: number): Decimal[] {
  const count = Math.max(1, Math.trunc(installments));
  const value = round2(total);
  if (count === 1) return [value];
  const base = value.dividedBy(count).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const parts: Decimal[] = [];
  let accumulated = new Decimal(0);
  for (let i = 0; i < count; i += 1) {
    if (i === count - 1) {
      parts.push(value.minus(accumulated));
    } else {
      parts.push(base);
      accumulated = accumulated.plus(base);
    }
  }
  return parts;
}

/** Desconto percentual limitado a 100%. */
export function applyPercentDiscount(base: Numeric, discountPercent: Numeric): Decimal {
  const pct = dec(discountPercent);
  const bounded = Decimal.max(0, Decimal.min(pct, 100));
  return round2(dec(base).minus(dec(base).times(bounded).dividedBy(100)));
}

/** Margem sobre venda: (preço - custo) / preço. */
export function marginOverPrice(price: Numeric, cost: Numeric): number {
  const p = dec(price);
  if (p.isZero()) return 0;
  return p.minus(dec(cost)).dividedBy(p).times(100).toDecimalPlaces(1).toNumber();
}

export function formatBRL(value: Numeric): string {
  const n = round2(value).toNumber();
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata quantidade removendo zeros desnecessários (2,000 → 2). */
export function formatQty(value: Numeric): string {
  const n = dec(value).toDecimalPlaces(3).toNumber();
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
