/**
 * Validação de códigos de barras (formato e dígito verificador).
 * Códigos são tratados como texto — zeros à esquerda são preservados.
 */

export type BarcodeKind = "EAN_13" | "EAN_8" | "UPC_A" | "UPC_E" | "INTERNO";

export type BarcodeValidation = {
  ok: boolean;
  kind: BarcodeKind;
  /** Mensagem quando `ok` é false. */
  message?: string;
  /** Código sugerido (dígito verificador corrigido), quando aplicável. */
  expected?: string;
};

/** Remove espaços nas bordas sem alterar o conteúdo (preserva zeros à esquerda). */
export function normalizeBarcode(value: string): string {
  return value.trim();
}

function weightedSum(digits: string, evenWeight: number, oddWeight: number): number {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    sum += Number(digits[index]) * (index % 2 === 0 ? evenWeight : oddWeight);
  }
  return sum;
}

/** Dígito verificador módulo 10 (GS1). */
function gs1CheckDigit(sum: number): number {
  return (10 - (sum % 10)) % 10;
}

/**
 * Valida o código informado.
 * - EAN-13 (13 dígitos), EAN-8 (8) e UPC-A (12) têm dígito verificador conferido.
 * - UPC-E (6 dígitos) é aceito pelo comprimento.
 * - Qualquer outro conteúdo (SKU interno, Code 128 alfanumérico) é aceito.
 */
export function validateBarcode(raw: string): BarcodeValidation {
  const code = normalizeBarcode(raw);
  if (!code) return { ok: true, kind: "INTERNO" };

  if (/^\d+$/.test(code)) {
    if (code.length === 13) {
      const expected = `${code.slice(0, 12)}${gs1CheckDigit(weightedSum(code.slice(0, 12), 1, 3))}`;
      if (expected !== code) {
        return {
          ok: false,
          kind: "EAN_13",
          message: `Dígito verificador inválido para EAN-13. Esperado ${expected}.`,
          expected,
        };
      }
      return { ok: true, kind: "EAN_13" };
    }
    if (code.length === 8) {
      const expected = `${code.slice(0, 7)}${gs1CheckDigit(weightedSum(code.slice(0, 7), 3, 1))}`;
      if (expected !== code) {
        return {
          ok: false,
          kind: "EAN_8",
          message: `Dígito verificador inválido para EAN-8. Esperado ${expected}.`,
          expected,
        };
      }
      return { ok: true, kind: "EAN_8" };
    }
    if (code.length === 12) {
      const expected = `${code.slice(0, 11)}${gs1CheckDigit(weightedSum(code.slice(0, 11), 3, 1))}`;
      if (expected !== code) {
        return {
          ok: false,
          kind: "UPC_A",
          message: `Dígito verificador inválido para UPC-A. Esperado ${expected}.`,
          expected,
        };
      }
      return { ok: true, kind: "UPC_A" };
    }
    if (code.length === 6) return { ok: true, kind: "UPC_E" };
    // Numérico com outro comprimento: código interno.
    return { ok: true, kind: "INTERNO" };
  }

  return { ok: true, kind: "INTERNO" };
}
