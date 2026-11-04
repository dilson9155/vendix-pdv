import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16, detectPixKeyType } from "./pix";

describe("PIX BR Code", () => {
  it("calcula o CRC16 de referência", () => {
    // Vetor clássico do CRC-16/CCITT-FALSE.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("monta um payload válido com os campos obrigatórios", () => {
    const payload = buildPixPayload({
      key: "vendix@exemplo.com",
      amount: 149.9,
      merchantName: "Vendix Tecnologia",
      merchantCity: "São Paulo",
      txid: "VXABC123",
    });

    expect(payload.startsWith("000201")).toBe(true);
    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("5303986");
    expect(payload).toContain("5406149.90");
    expect(payload).toContain("5802BR");
    expect(payload).toContain("VENDIX TECNOLOGIA");
    expect(payload).toContain("SAO PAULO");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("rejeita chave vazia", () => {
    expect(() =>
      buildPixPayload({
        key: " ",
        amount: 10,
        merchantName: "Vendix",
        merchantCity: "Sao Paulo",
      })
    ).toThrow(/Chave PIX/);
  });

  it("identifica tipos de chave", () => {
    expect(detectPixKeyType("123.456.789-00")).toBe("CPF");
    expect(detectPixKeyType("12.345.678/0001-99")).toBe("CNPJ");
    expect(detectPixKeyType("cobranca@vendix.com")).toBe("EMAIL");
    expect(detectPixKeyType("+55 11 99999-9999")).toBe("TELEFONE");
    expect(detectPixKeyType("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe("ALEATORIA");
  });
});
