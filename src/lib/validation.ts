import { z } from "zod";

export const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined));

export const requiredText = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

export const idSchema = z.string().trim().min(1, "Registro inválido.");

/**
 * SKU opcional. Quando vem vazio o serviço gera um código único
 * automaticamente (produto e variações).
 */
export const optionalSku = z
  .string()
  .trim()
  .max(60, "SKU deve ter no máximo 60 caracteres.")
  .optional()
  .transform((v) => (v ? v : undefined));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");

export const optionalEmail = z
  .union([z.literal(""), z.string().trim().toLowerCase().email("Informe um e-mail válido.")])
  .optional()
  .transform((v) => (v ? v : undefined));

/**
 * Normaliza texto numérico aceitando os formatos usados no Brasil e no exterior:
 * "10,50", "10.50", "1.234,56", "1,234.56", "R$ 10,00".
 * Retorna `null` quando o texto não é um número válido.
 */
export function normalizeDecimalText(value: string): string | null {
  const compact = value
    .replace(/R\$\s*/gi, "")
    .replace(/\s|\u00a0/g, "")
    .trim();
  if (!compact) return "";

  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");

  if (hasComma && hasDot) {
    // O separador decimal é o que aparece por último.
    return compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(/,/g, ".")
      : compact.replace(/,/g, "");
  }
  if (hasComma) return compact.replace(/,/g, ".");
  if (hasDot) {
    // "1.234" e "1.234.567" são separadores de milhar; "10.50" é decimal.
    return /^[+-]?\d{1,3}(\.\d{3})+$/.test(compact) ? compact.replace(/\./g, "") : compact;
  }
  return compact;
}

/**
 * Converte um valor de formulário em número.
 * - `undefined`, `null` e texto vazio → `undefined` (campo não informado)
 * - texto inválido ou `NaN` → `null` (valor rejeitado)
 */
export function parseDecimal(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = normalizeDecimalText(value);
  if (normalized === "") return undefined;
  if (normalized === null || !/^[+-]?\d+(\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

type NumberInputOptions = {
  /** Nome do campo, usado nas mensagens de erro. */
  label: string;
  /** Campo opcional: vazio vira `undefined` em vez de erro. */
  optional?: boolean;
  /** Valor assumido quando o campo vem vazio (ex.: 0 em campos com padrão). */
  fallback?: number;
  min?: number;
  /** Exige valor estritamente maior que este número (ex.: 0 para "maior que zero"). */
  gt?: number;
  max?: number;
  integer?: boolean;
  /** Mensagem personalizada para conteúdo não numérico. */
  message?: string;
};

/**
 * Campo numérico tolerante a formulários: aceita string com vírgula ou ponto,
 * converte antes de validar e nunca deixa `NaN` chegar ao serviço/banco.
 */
export function numberInput<const O extends NumberInputOptions>(
  options: O
): z.ZodType<O extends { optional: true } ? number | undefined : number> {
  const { label, optional, fallback, min, gt, max, integer, message } = options;
  const invalidMessage = message ?? `${label}: informe um número válido (ex.: 10,50).`;

  const core = z
    .number({ error: invalidMessage })
    .refine((v) => min === undefined || v >= min, `${label} não pode ser menor que ${min ?? 0}.`)
    .refine((v) => gt === undefined || v > gt, `${label} deve ser maior que ${gt ?? 0}.`)
    .refine((v) => max === undefined || v <= max, `${label} não pode ser maior que ${max ?? 0}.`)
    .refine((v) => !integer || Number.isInteger(v), `${label} deve ser um número inteiro.`);

  // O preprocess converte antes de validar: campos vazios/ausentes usam
  // `fallback` (ou viram `undefined` em campos opcionais) e textos inválidos
  // viram NaN, que o schema rejeita com mensagem amigável — nunca é validado.
  const schema = z.preprocess((value) => {
    const parsed = parseDecimal(value);
    if (parsed === undefined) return fallback;
    return parsed === null ? Number.NaN : parsed;
  }, optional ? core.optional() : core);

  return schema as unknown as z.ZodType<O extends { optional: true } ? number | undefined : number>;
}

export const moneyInput = numberInput({
  label: "Valor",
  min: 0,
  message: "Valor inválido. Informe um número, por exemplo 10,50.",
});

export const positiveMoneyInput = numberInput({
  label: "Valor",
  gt: 0,
  message: "Valor inválido. Informe um número, por exemplo 10,50.",
});

export const quantityInput = numberInput({
  label: "Quantidade",
  message: "Quantidade inválida. Informe um número, por exemplo 2,5.",
});

export const dateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const optionalDateInput = z
  .union([z.literal(""), dateInput])
  .optional()
  .transform((v) => (v ? v : undefined));

export const documentSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 11 || v.length === 14, "CPF/CNPJ inválido.")
  .optional()
  .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 10 || v.length === 11, "Telefone inválido.")
  .optional()
  .transform((v) => (v ? v : undefined));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha."),
});

export const customerSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 160),
  document: documentSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: optionalEmail,
  birthDate: optionalDateInput,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  zipCode: optionalText,
  notes: optionalText,
  active: z.boolean().default(true),
  consent: z.boolean().default(false),
});

export const supplierSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 160),
  document: documentSchema,
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalText,
  notes: optionalText,
  active: z.boolean().default(true),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 80),
  parentId: z.string().optional(),
  active: z.boolean().default(true),
});

export const brandSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 80),
  active: z.boolean().default(true),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: optionalSku,
  barcode: z.string().trim().max(60).optional(),
  size: z.string().trim().max(30).optional(),
  color: z.string().trim().max(40).optional(),
  model: z.string().trim().max(60).optional(),
  cost: numberInput({ label: "Custo", min: 0, optional: true }),
  price: numberInput({ label: "Preço", min: 0, optional: true }),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 160),
  description: optionalText,
  sku: optionalSku,
  barcode: z.string().trim().max(60).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z.enum(["UN", "KG", "LT", "MT", "CX", "PCT"]).default("UN"),
  cost: numberInput({ label: "Custo", min: 0 }),
  price: numberInput({ label: "Preço", min: 0 }),
  promoPrice: numberInput({ label: "Preço promocional", min: 0, optional: true }),
  promoStart: optionalDateInput,
  promoEnd: optionalDateInput,
  minStock: numberInput({ label: "Estoque mínimo", min: 0, fallback: 0 }),
  maxStock: numberInput({ label: "Estoque máximo", min: 0, optional: true }),
  ncm: z.string().trim().max(10).optional(),
  cest: z.string().trim().max(10).optional(),
  origin: z.string().trim().max(10).optional(),
  trackStock: z.boolean().default(true),
  hasVariants: z.boolean().default(false),
  imageUrl: z.string().trim().max(500).optional(),
  active: z.boolean().default(true),
  variants: z.array(productVariantSchema).default([]),
});

export const stockMovementSchema = z.object({
  branchId: idSchema,
  productId: idSchema,
  variantId: z.string().optional(),
  type: z.enum(["ENTRADA", "SAIDA", "AJUSTE", "TRANSFERENCIA", "INVENTARIO"]),
  quantity: numberInput({
    label: "Quantidade",
    message: "Quantidade inválida. Informe um número, por exemplo 2,5.",
  }).refine((v) => v !== 0, "Informe uma quantidade diferente de zero."),
  unitCost: numberInput({ label: "Custo unitário", min: 0, optional: true }),
  reason: requiredText("Motivo", 300),
  document: z.string().trim().max(60).optional(),
});

export const stockTransferSchema = z.object({
  fromBranchId: idSchema,
  toBranchId: idSchema,
  productId: idSchema,
  variantId: z.string().optional(),
  quantity: numberInput({ label: "Quantidade", gt: 0 }),
  reason: optionalText,
});

export const cartItemSchema = z.object({
  productId: idSchema,
  variantId: z.string().optional(),
  quantity: numberInput({ label: "Quantidade", gt: 0 }),
  unitPrice: numberInput({ label: "Preço unitário", min: 0 }),
  discount: numberInput({ label: "Desconto", min: 0, fallback: 0 }),
});

export const salePaymentSchema = z.object({
  paymentMethodId: idSchema,
  amount: numberInput({ label: "Valor do pagamento", gt: 0 }),
  installments: numberInput({ label: "Parcelas", integer: true, fallback: 1, min: 1, max: 36 }),
  notes: z.string().trim().max(300).optional(),
});

export const saleSchema = z.object({
  branchId: idSchema,
  cashSessionId: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1, "Adicione ao menos um item."),
  payments: z.array(salePaymentSchema).default([]),
  discount: numberInput({ label: "Desconto", min: 0, fallback: 0 }),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export const cashOpenSchema = z.object({
  branchId: idSchema,
  terminalName: requiredText("Terminal", 60),
  openingAmount: numberInput({ label: "Fundo de troco", min: 0, fallback: 0 }),
  notes: z.string().trim().max(300).optional(),
});

export const cashMovementSchema = z.object({
  sessionId: idSchema,
  type: z.enum(["SUPRIMENTO", "SANGRIA"]),
  amount: numberInput({ label: "Valor", gt: 0 }),
  reason: requiredText("Motivo", 200),
});

export const cashCloseSchema = z.object({
  sessionId: idSchema,
  countedCash: numberInput({ label: "Valor contado", min: 0, fallback: 0 }),
  notes: z.string().trim().max(300).optional(),
});

export const payableSchema = z.object({
  id: z.string().optional(),
  branchId: idSchema,
  supplierId: z.string().optional(),
  description: requiredText("Descrição", 200),
  document: z.string().trim().max(60).optional(),
  chartAccountId: z.string().optional(),
  costCenterId: z.string().optional(),
  issueDate: dateInput,
  competenceDate: dateInput,
  dueDate: dateInput,
  value: positiveMoneyInput,
  valueMode: z.enum(["TOTAL", "INSTALLMENT"]).default("TOTAL"),
  installments: numberInput({ label: "Parcelas", integer: true, fallback: 1, min: 1, max: 36 }),
  notes: z.string().trim().max(500).optional(),
});

export const receivableSchema = z.object({
  id: z.string().optional(),
  branchId: idSchema,
  customerId: z.string().optional(),
  description: requiredText("Descrição", 200),
  document: z.string().trim().max(60).optional(),
  chartAccountId: z.string().optional(),
  costCenterId: z.string().optional(),
  issueDate: dateInput,
  competenceDate: dateInput,
  dueDate: dateInput,
  value: positiveMoneyInput,
  valueMode: z.enum(["TOTAL", "INSTALLMENT"]).default("TOTAL"),
  installments: numberInput({ label: "Parcelas", integer: true, fallback: 1, min: 1, max: 36 }),
  notes: z.string().trim().max(500).optional(),
});

export const settlementSchema = z.object({
  id: idSchema,
  financialAccountId: idSchema,
  date: dateInput,
  amount: numberInput({ label: "Valor", gt: 0 }),
  interest: numberInput({ label: "Juros", min: 0, fallback: 0 }),
  penalty: numberInput({ label: "Multa", min: 0, fallback: 0 }),
  discount: numberInput({ label: "Desconto", min: 0, fallback: 0 }),
  method: z.string().trim().max(40).optional(),
  document: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const reversalSchema = z.object({
  paymentId: idSchema,
  reason: requiredText("Motivo do estorno", 300),
});

export const financialAccountSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 80),
  type: z.enum(["CAIXA", "BANCO", "CARTAO", "OUTROS"]),
  branchId: z.string().optional(),
  bankName: z.string().trim().max(80).optional(),
  agency: z.string().trim().max(20).optional(),
  accountNumber: z.string().trim().max(30).optional(),
  initialBalance: numberInput({ label: "Saldo inicial", min: 0, fallback: 0 }),
  initialBalanceDate: dateInput,
  active: z.boolean().default(true),
});

export const chartAccountSchema = z.object({
  id: z.string().optional(),
  code: requiredText("Código", 20),
  name: requiredText("Nome", 120),
  nature: z.enum(["RECEITA", "DESPESA", "CUSTO", "ATIVO", "PASSIVO", "PATRIMONIO"]),
  parentId: z.string().optional(),
  isAnalytic: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const costCenterSchema = z.object({
  id: z.string().optional(),
  code: requiredText("Código", 20),
  name: requiredText("Nome", 80),
  description: z.string().trim().max(300).optional(),
  active: z.boolean().default(true),
});

export const transferSchema = z.object({
  fromAccountId: idSchema,
  toAccountId: idSchema,
  amount: positiveMoneyInput,
  date: dateInput,
  description: requiredText("Descrição", 200),
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  email: emailSchema,
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").optional().or(z.literal("")),
  phone: phoneSchema,
  roleId: idSchema,
  branchId: z.string().optional(),
  active: z.boolean().default(true),
});

export const roleSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 60),
  description: z.string().trim().max(200).optional(),
  permissions: z.array(z.string()).default([]),
});

export const settingsSchema = z.object({
  tradeName: requiredText("Nome fantasia", 120),
  legalName: z.string().trim().max(160).optional(),
  document: documentSchema,
  phone: phoneSchema,
  email: optionalEmail,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  zipCode: z.string().trim().max(9).optional(),
  receiptFooter: z.string().trim().max(300).optional(),
  receiptWidth: z.enum(["58", "80"]).default("80"),
  allowNegativeStock: z.boolean().default(false),
  maxDiscountPercent: numberInput({ label: "Desconto máximo (%)", min: 0, max: 100, fallback: 10 }),
  requireCustomerOnCredit: z.boolean().default(true),
});

export const planSchema = z.object({
  id: z.string().optional(),
  code: requiredText("Código", 30),
  name: requiredText("Nome", 80),
  description: z.string().trim().max(300).optional(),
  price: numberInput({ label: "Preço", min: 0 }),
  trialDays: numberInput({ label: "Dias de teste", integer: true, min: 0, max: 365, fallback: 14 }),
  maxUsers: numberInput({ label: "Máximo de usuários", integer: true, min: 1, optional: true }),
  maxBranches: numberInput({ label: "Máximo de filiais", integer: true, min: 1, optional: true }),
  maxProducts: numberInput({ label: "Máximo de produtos", integer: true, min: 1, optional: true }),
});

export const tenantSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  legalName: z.string().trim().max(160).optional(),
  document: documentSchema,
  email: optionalEmail,
  phone: phoneSchema,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  zipCode: z.string().trim().max(9).optional(),
  planId: idSchema,
  adminName: requiredText("Responsável", 120),
  adminEmail: emailSchema,
  adminPassword: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  trialDays: numberInput({ label: "Dias de teste", integer: true, min: 0, max: 90, fallback: 14 }),
});

export const tenantUpdateSchema = z.object({
  id: idSchema,
  name: requiredText("Nome", 120),
  legalName: z.string().trim().max(160).optional(),
  document: documentSchema,
  email: optionalEmail,
  phone: phoneSchema,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  zipCode: z.string().trim().max(9).optional(),
  planId: idSchema,
  status: z.enum(["ATIVO", "SUSPENSO", "CANCELADO"]),
  trialEndsAt: optionalDateInput,
  notes: z.string().trim().max(4000).optional(),
});

export const chargePaymentFieldsSchema = z.object({
  method: z.enum(["PIX", "BOLETO", "TRANSFERENCIA", "OUTRO"]).default("PIX"),
  boletoCode: z.string().trim().max(2000).optional(),
  boletoUrl: z.string().trim().url("Informe uma URL válida.").optional().or(z.literal("")),
  paymentUrl: z.string().trim().url("Informe uma URL válida.").optional().or(z.literal("")),
  instructions: z.string().trim().max(2000).optional(),
});

export const platformChargeSchema = chargePaymentFieldsSchema
  .extend({
    tenantId: idSchema,
    description: requiredText("Descrição", 160),
    referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido."),
    amount: positiveMoneyInput,
    dueDate: dateInput,
    notes: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "BOLETO" && !value.boletoCode && !value.boletoUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["boletoCode"],
        message: "Informe a linha digitável ou o link do boleto.",
      });
    }
  });

export const chargeUpdateSchema = chargePaymentFieldsSchema.extend({
  id: idSchema,
  description: requiredText("Descrição", 160),
  amount: positiveMoneyInput,
  dueDate: dateInput,
  notes: z.string().trim().max(300).optional(),
});

export const platformConfigSchema = z.object({
  pixKey: z.string().trim().max(120).optional(),
  pixKeyType: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"]).optional()
  ),
  pixBeneficiary: z.string().trim().max(60).optional(),
  pixCity: z.string().trim().max(40).optional(),
  boletoInstructions: z.string().trim().max(2000).optional(),
  supportWhatsapp: z.string().trim().max(20).optional(),
  billingDueDay: numberInput({ label: "Dia de vencimento", integer: true, min: 1, max: 28, fallback: 10 }),
  graceDays: numberInput({ label: "Dias de carência", integer: true, min: 0, max: 120, fallback: 5 }),
  autoSuspend: z.boolean().default(false),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PayableInput = z.infer<typeof payableSchema>;
export type ReceivableInput = z.infer<typeof receivableSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
