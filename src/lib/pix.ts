/**
 * Gerador de BR Code PIX (padrão EMV® MPM do Banco Central).
 *
 * O código "copia e cola" é montado no servidor e usado tanto no QR Code
 * quanto no botão de copiar. Nenhum dado sensível é necessário: apenas a
 * chave PIX, o valor da cobrança e o nome/cidade do beneficiário.
 */

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";

const PIX_KEY_TYPES: PixKeyType[] = ["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"];

export function isPixKeyType(value: unknown): value is PixKeyType {
  return typeof value === "string" && (PIX_KEY_TYPES as string[]).includes(value);
}

export type PixPayloadInput = {
  key: string;
  /** Tipo da chave quando já conhecido (evita ambiguidade entre CPF e telefone). */
  keyType?: PixKeyType | null;
  amount: number;
  merchantName: string;
  merchantCity: string;
  /** Identificador da transação (alfanumérico, até 25 caracteres). */
  txid?: string;
  /** Descrição opcional exibida no aplicativo do banco (até 72 caracteres). */
  description?: string;
};

/** Remove acentos e caracteres que não são aceitos pelo BR Code. */
function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function field(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

/** CRC16/CCITT-FALSE, exigido pelo campo 63 do BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Identifica o tipo da chave apenas para exibição/ajuda na interface.
 *
 * O telefone PIX sempre leva o DDI (+55); CPF tem 11 dígitos e CNPJ tem 14.
 * A ordem das checagens evita que um CPF sem máscara seja confundido com
 * telefone — antes isso acontecia e o código gerado ficava inválido.
 */
export function detectPixKeyType(key: string): PixKeyType {
  const value = key.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "EMAIL";

  const digits = value.replace(/\D/g, "");
  const looksLikePhone =
    value.startsWith("+") ||
    /[()]/.test(value) ||
    (/\s/.test(value) && digits.length >= 10 && digits.length <= 13);
  if (looksLikePhone && digits.length >= 10 && digits.length <= 13) return "TELEFONE";

  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11) return "CPF";
  return "ALEATORIA";
}

/**
 * Normaliza a chave para o formato exigido dentro do BR Code:
 * CPF/CNPJ somente dígitos; telefone com `+55`; e-mail em minúsculas.
 * Sem isso, uma chave mascarada (ex.: `58.314.976/0001-19`) gera um QR Code
 * e um copia e cola inválidos, mesmo que a chave esteja correta no cadastro.
 */
export function normalizePixKey(key: string, keyType?: PixKeyType | null): string {
  const value = key.trim();
  if (!value) return value;

  const type = keyType ?? detectPixKeyType(value);
  switch (type) {
    case "CPF":
    case "CNPJ":
      return value.replace(/\D/g, "");
    case "TELEFONE": {
      const digits = value.replace(/\D/g, "");
      if (!digits) return value;
      return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
    }
    case "EMAIL":
      return value.toLowerCase();
    default:
      return value;
  }
}

/** Monta o payload PIX completo (copia e cola). */
export function buildPixPayload(input: PixPayloadInput): string {
  const key = input.key.trim();
  if (!key) throw new Error("Chave PIX não configurada.");

  const normalizedKey = normalizePixKey(key, input.keyType);
  const name = sanitize(input.merchantName || "VENDIX", 25);
  const city = sanitize(input.merchantCity || "SAO PAULO", 15);
  const txid = sanitize(input.txid || "***", 25).replace(/\s/g, "") || "***";

  const merchantAccount =
    field("00", "br.gov.bcb.pix") +
    field("01", normalizedKey) +
    (input.description ? field("02", sanitize(input.description, 72)) : "");

  const payload =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    field("54", input.amount.toFixed(2)) +
    field("58", "BR") +
    field("59", name) +
    field("60", city) +
    field("62", field("05", txid)) +
    "6304";

  return `${payload}${crc16(payload)}`;
}

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  ALEATORIA: "Chave aleatória",
};
