import { describe, expect, it } from "vitest";
import { normalizeBarcode, validateBarcode } from "@/lib/barcode";

describe("normalizeBarcode", () => {
  it("remove apenas espaços das bordas", () => {
    expect(normalizeBarcode("  7891000100011 ")).toBe("7891000100011");
  });

  it("preserva zeros à esquerda", () => {
    expect(normalizeBarcode("0001234567890")).toBe("0001234567890");
  });
});

describe("validateBarcode", () => {
  it("aceita vazio (campo opcional)", () => {
    expect(validateBarcode("")).toEqual({ ok: true, kind: "INTERNO" });
  });

  it("valida EAN-13 com dígito verificador correto", () => {
    // Código real de produto do catálogo de demonstração.
    expect(validateBarcode("7891000100011")).toEqual({ ok: true, kind: "EAN_13" });
  });

  it("rejeita EAN-13 com dígito verificador errado e sugere o correto", () => {
    const result = validateBarcode("7891000100010");
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("EAN_13");
    expect(result.expected).toBe("7891000100011");
    expect(result.message).toContain("7891000100011");
  });

  it("valida EAN-8 correto", () => {
    expect(validateBarcode("96385074")).toEqual({ ok: true, kind: "EAN_8" });
  });

  it("rejeita EAN-8 com dígito verificador errado", () => {
    const result = validateBarcode("96385075");
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("EAN_8");
    expect(result.expected).toBe("96385074");
  });

  it("valida UPC-A correto", () => {
    expect(validateBarcode("036000291452")).toEqual({ ok: true, kind: "UPC_A" });
  });

  it("rejeita UPC-A com dígito verificador errado", () => {
    const result = validateBarcode("036000291453");
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("UPC_A");
    expect(result.expected).toBe("036000291452");
  });

  it("aceita UPC-E (6 dígitos)", () => {
    expect(validateBarcode("123456")).toEqual({ ok: true, kind: "UPC_E" });
  });

  it("aceita código interno alfanumérico", () => {
    expect(validateBarcode("BAT-001")).toEqual({ ok: true, kind: "INTERNO" });
  });

  it("preserva zeros à esquerda ao validar", () => {
    // EAN-13 com zeros à esquerda continua sendo validado como tal.
    expect(validateBarcode("0012345678905")).toEqual({ ok: true, kind: "EAN_13" });
    expect(validateBarcode("0000000000017").ok).toBe(true);
  });
});
