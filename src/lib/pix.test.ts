import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16, detectPixKeyType, normalizePixKey } from "./pix";

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

  it("normaliza CNPJ mascarado para somente dígitos", () => {
    expect(normalizePixKey("58.314.976/0001-19")).toBe("58314976000119");

    const payload = buildPixPayload({
      key: "58.314.976/0001-19",
      amount: 100,
      merchantName: "Edilson Marcio",
      merchantCity: "Barbacena",
      txid: "VXTESTE",
    });

    // Campo 26 > 01 (chave) com tamanho 14 e apenas dígitos.
    expect(payload).toContain("011458314976000119");
    expect(payload).not.toContain("58.314.976/0001-19");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("normaliza CPF mascarado para somente dígitos", () => {
    expect(normalizePixKey("123.456.789-00")).toBe("12345678900");

    const payload = buildPixPayload({
      key: "123.456.789-00",
      keyType: "CPF",
      amount: 49.9,
      merchantName: "Vendix",
      merchantCity: "Sao Paulo",
    });

    expect(payload).toContain("011112345678900");
  });

  it("adiciona o DDI +55 ao telefone sem código do país", () => {
    expect(normalizePixKey("11 99999-9999", "TELEFONE")).toBe("+5511999999999");
    expect(normalizePixKey("+55 11 99999-9999", "TELEFONE")).toBe("+5511999999999");
  });

  it("mantém e-mail em minúsculas", () => {
    expect(normalizePixKey("Cobranca@Vendix.COM", "EMAIL")).toBe("cobranca@vendix.com");
  });

  it("diferença CPF x telefone usa o tipo informado", () => {
    // 11 dígitos sem máscara: sem o tipo explícito seria tratado como CPF.
    expect(normalizePixKey("11999999999", "TELEFONE")).toBe("+5511999999999");
    expect(normalizePixKey("11999999999", "CPF")).toBe("11999999999");
  });
});
