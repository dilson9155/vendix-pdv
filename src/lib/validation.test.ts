import { describe, expect, it } from "vitest";
import {
  cashOpenSchema,
  moneyInput,
  numberInput,
  parseDecimal,
  productSchema,
  salePaymentSchema,
  settlementSchema,
} from "@/lib/validation";

describe("parseDecimal", () => {
  it("trata vazio, nulo e indefinido como campo não informado", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("   ")).toBeUndefined();
    expect(parseDecimal(null)).toBeUndefined();
    expect(parseDecimal(undefined)).toBeUndefined();
  });

  it("aceita vírgula como separador decimal", () => {
    expect(parseDecimal("0,00")).toBe(0);
    expect(parseDecimal("10,50")).toBe(10.5);
    expect(parseDecimal("2,5")).toBe(2.5);
  });

  it("aceita ponto como separador decimal", () => {
    expect(parseDecimal("10.50")).toBe(10.5);
    expect(parseDecimal(10.5)).toBe(10.5);
  });

  it("aceita separador de milhar nos dois formatos", () => {
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("1,234.56")).toBe(1234.56);
    expect(parseDecimal("1.234")).toBe(1234);
    expect(parseDecimal("1.234.567,89")).toBe(1234567.89);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(parseDecimal("R$ 10,00")).toBe(10);
  });

  it("rejeita valores não numéricos e NaN", () => {
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("10,5,0")).toBeNull();
    expect(parseDecimal("R$")).toBeUndefined();
    expect(parseDecimal(Number.NaN)).toBeNull();
    expect(parseDecimal(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("numberInput", () => {
  it("converte strings com vírgula antes de validar", () => {
    const parsed = numberInput({ label: "Valor", min: 0 }).safeParse("10,50");
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toBe(10.5);
  });

  it("usa fallback quando o campo vem vazio", () => {
    const parsed = numberInput({ label: "Valor", min: 0, fallback: 0 }).safeParse("");
    expect(parsed.success && parsed.data).toBe(0);
  });

  it("permite vazio em campo opcional", () => {
    const parsed = numberInput({ label: "Custo", min: 0, optional: true }).safeParse("");
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toBeUndefined();
  });

  it("exige campo obrigatório com mensagem amigável", () => {
    const parsed = numberInput({ label: "Custo", min: 0 }).safeParse(undefined);
    expect(parsed.success).toBe(false);
    const messages = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    expect(messages.join(" ")).toContain("Custo: informe um número válido");
    expect(messages.join(" ")).not.toContain("NaN");
  });

  it("exibe mensagem amigável (sem NaN) para texto inválido", () => {
    const parsed = numberInput({ label: "Preço", min: 0 }).safeParse("abc");
    expect(parsed.success).toBe(false);
    const messages = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    expect(messages.join(" ")).not.toContain("NaN");
    expect(messages.join(" ")).toContain("Preço: informe um número válido");
  });

  it("valida mínimo, máximo e inteiros", () => {
    expect(numberInput({ label: "Valor", gt: 0 }).safeParse("0").success).toBe(false);
    expect(numberInput({ label: "Valor", min: 0, max: 100 }).safeParse("150").success).toBe(false);
    expect(numberInput({ label: "Parcelas", integer: true }).safeParse("2,5").success).toBe(false);
  });
});

describe("schemas de formulários", () => {
  const productBase = {
    name: "Produto teste",
    sku: "TESTE-1",
    unit: "UN",
    cost: "0,00",
    price: "19,90",
    minStock: "0",
  };

  it("aceita produto com custo/preço no padrão brasileiro", () => {
    const parsed = productSchema.safeParse(productBase);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.cost).toBe(0);
    expect(parsed.success && parsed.data.price).toBe(19.9);
  });

  it("aceita produto sem SKU para geração automática", () => {
    const parsed = productSchema.safeParse({ ...productBase, sku: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.sku).toBeUndefined();
  });

  it("aceita variação sem SKU para geração automática", () => {
    const parsed = productSchema.safeParse({
      ...productBase,
      hasVariants: true,
      variants: [{ sku: "", barcode: "", size: "M", color: "Azul" }],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.variants[0]?.sku).toBeUndefined();
  });

  it("rejeita custo inválido com mensagem amigável", () => {
    const parsed = productSchema.safeParse({ ...productBase, cost: "abc" });
    expect(parsed.success).toBe(false);
    const messages = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    expect(messages.join(" ")).toContain("Custo: informe um número válido");
    expect(messages.join(" ")).not.toContain("NaN");
  });

  it("abre caixa com fundo de troco padrão 0,00", () => {
    const parsed = cashOpenSchema.safeParse({
      branchId: "branch-1",
      terminalName: "Caixa 1",
      openingAmount: "0,00",
    });
    expect(parsed.success && parsed.data.openingAmount).toBe(0);
  });

  it("normaliza pagamento e parcelas da venda", () => {
    const parsed = salePaymentSchema.safeParse({
      paymentMethodId: "pm-1",
      amount: "10,50",
      installments: "",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.amount).toBe(10.5);
    expect(parsed.success && parsed.data.installments).toBe(1);
  });

  it("aceita juros/multa/desconto vazios na liquidação", () => {
    const parsed = settlementSchema.safeParse({
      id: "rec-1",
      financialAccountId: "acc-1",
      date: "2026-11-06",
      amount: "100,00",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.interest).toBe(0);
    expect(parsed.success && parsed.data.penalty).toBe(0);
    expect(parsed.success && parsed.data.discount).toBe(0);
  });
});

describe("moneyInput", () => {
  it("aceita valores nos dois formatos e rejeita negativos", () => {
    expect(moneyInput.safeParse("1.234,56").success).toBe(true);
    expect(moneyInput.safeParse("1234.56").success).toBe(true);
    expect(moneyInput.safeParse("-1").success).toBe(false);
    // Campo obrigatório: vazio gera mensagem amigável (nunca NaN).
    const empty = moneyInput.safeParse("");
    expect(empty.success).toBe(false);
    expect(empty.success === false && empty.error.issues[0].message).toContain("Valor inválido");
  });
});
