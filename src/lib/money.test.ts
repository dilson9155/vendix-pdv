import { describe, expect, it } from "vitest";
import {
  applyPercentDiscount,
  dec,
  Decimal,
  formatBRL,
  formatPercent,
  formatQty,
  marginOverPrice,
  money,
  multiply,
  percent,
  round2,
  safeDivide,
  splitInstallments,
  sumValues,
  toNumber,
} from "@/lib/money";

describe("money — dec", () => {
  it("retorna zero para valores ausentes", () => {
    expect(dec(null).toNumber()).toBe(0);
    expect(dec(undefined).toNumber()).toBe(0);
    expect(dec("").toNumber()).toBe(0);
  });

  it("converte strings e números", () => {
    expect(dec("12.5").toNumber()).toBe(12.5);
    expect(dec(3).toNumber()).toBe(3);
  });
});

describe("money — round2", () => {
  it("arredonda para duas casas com half-up", () => {
    expect(round2(1.005).toNumber()).toBe(1.01);
    expect(round2(2.004).toNumber()).toBe(2);
    expect(round2(0).toNumber()).toBe(0);
  });
});

describe("money — money", () => {
  it("retorna string com duas casas para persistência", () => {
    expect(money(10.5)).toBe("10.50");
    expect(money(0)).toBe("0.00");
    expect(money("12.345")).toBe("12.35");
  });
});

describe("money — splitInstallments", () => {
  it("divide igualmente sem perder centavos", () => {
    expect(splitInstallments(100, 3).map((part) => part.toNumber())).toEqual([33.33, 33.33, 33.34]);
  });

  it("mantém o total original", () => {
    const parts = splitInstallments(10, 3);
    const total = parts.reduce((acc, part) => acc.plus(part), new Decimal(0));
    expect(total.toNumber()).toBe(10);
  });

  it("retorna um único parcela quando o total é o número de parcelas", () => {
    expect(splitInstallments(99, 1).map((part) => part.toNumber())).toEqual([99]);
  });
});

describe("money — descontos e margens", () => {
  it("aplica desconto percentual limitado a 100%", () => {
    expect(applyPercentDiscount(100, 10).toNumber()).toBe(90);
    expect(applyPercentDiscount(100, 150).toNumber()).toBe(0);
  });

  it("calcula margem sobre o preço", () => {
    expect(marginOverPrice(80, 50)).toBe(37.5);
    expect(marginOverPrice(0, 0)).toBe(0);
  });
});

describe("money — soma e divisão", () => {
  it("soma valores monetários", () => {
    expect(sumValues([1.1, 2.2]).toNumber()).toBe(3.3);
  });

  it("divide com divisor seguro", () => {
    expect(safeDivide(10, 0).toNumber()).toBe(0);
    expect(safeDivide(10, 2).toNumber()).toBe(5);
  });

  it("calcula percentual", () => {
    expect(percent(50, 200)).toBe(25);
  });

  it("multiplica valores", () => {
    expect(multiply(3, 2.5).toNumber()).toBe(7.5);
  });

  it("converte para number apenas na exibição", () => {
    expect(toNumber(10.567)).toBe(10.57);
  });
});

describe("money — formatação", () => {
  it("formata valores em BRL", () => {
    expect(formatBRL(1234.5)).toContain("1.234,50");
    expect(formatBRL(0)).toBe("R$\u00A00,00");
  });

  it("formata percentual", () => {
    expect(formatPercent(66.666)).toBe("66,7%");
  });

  it("formata quantidade", () => {
    expect(formatQty(2)).toBe("2");
    expect(formatQty(2.5)).toBe("2,5");
  });
});
