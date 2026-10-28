import { describe, expect, it } from "vitest";
import { calculateDre } from "@/services/dre-calculator";

describe("DRE — calculateDre", () => {
  it("calcula resultado operacional completo", () => {
    const result = calculateDre({
      grossRevenue: 1000,
      returns: 100,
      cogs: 300,
      otherRevenues: 50,
      expenses: [{ code: "4.1.1", name: "Salários", amount: 200 }],
    });

    expect(result.grossRevenue).toBe(1000);
    expect(result.returns).toBe(100);
    expect(result.netRevenue).toBe(900);
    expect(result.cogs).toBe(300);
    expect(result.grossProfit).toBe(600);
    expect(result.grossMargin).toBeCloseTo(66.67, 1);
    expect(result.totalExpenses).toBe(200);
    expect(result.operatingResult).toBe(400);
    expect(result.netResult).toBe(450);
    expect(result.netMargin).toBeCloseTo(50, 1);
    expect(result.otherRevenues).toBe(50);
  });

  it("calcula ponto de equilíbrio quando margem for positiva", () => {
    const result = calculateDre({
      grossRevenue: 900,
      returns: 0,
      cogs: 300,
      expenses: [{ code: "4.2.2", name: "Fretes", amount: 100 }],
    });

    // Margem bruta: (900 - 300) / 900 = 66,67%
    // Break-even: 100 / 0,6667 = 150
    expect(result.breakEvenRevenue).toBeCloseTo(150, 1);
  });

  it("retorna zero de ponto de equilíbrio sem margem", () => {
    const result = calculateDre({
      grossRevenue: 100,
      returns: 0,
      cogs: 110,
      expenses: [],
    });

    expect(result.breakEvenRevenue).toBe(0);
  });

  it("ignora linhas de despesa com valor zero", () => {
    const result = calculateDre({
      grossRevenue: 500,
      returns: 0,
      cogs: 100,
      expenses: [
        { code: "4.1.1", name: "Salários", amount: 0 },
        { code: "4.2.1", name: "Taxas", amount: 50 },
      ],
    });

    expect(result.totalExpenses).toBe(50);
    expect(result.expenses).toHaveLength(1);
  });
});
