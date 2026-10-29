/**
 * Precision Financial & Currency Utilities for Vendix SaaS
 * Enforces cent-based arithmetic to prevent binary floating-point roundoff issues.
 */

export function toCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function addCurrency(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractCurrency(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyCurrency(amount: number, quantity: number): number {
  return fromCents(Math.round(toCents(amount) * quantity) / 100);
}

export function formatBRL(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatNumber(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
}

export function calculateMarkup(costPrice: number, salePrice: number): number {
  if (!costPrice || costPrice <= 0) return 0;
  return ((salePrice - costPrice) / costPrice) * 100;
}

export function calculateGrossMargin(costPrice: number, salePrice: number): number {
  if (!salePrice || salePrice <= 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}
