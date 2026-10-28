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

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");

export const optionalEmail = z
  .union([z.literal(""), z.string().trim().toLowerCase().email("Informe um e-mail válido.")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const moneyInput = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v))
  .pipe(z.number().finite("Valor inválido."))
  .refine((v) => v >= 0, "O valor não pode ser negativo.");

export const positiveMoneyInput = moneyInput.refine((v) => v > 0, "Informe um valor maior que zero.");

export const quantityInput = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v))
  .pipe(z.number().finite("Quantidade inválida."));

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
  sku: requiredText("SKU", 60),
  barcode: z.string().trim().max(60).optional(),
  size: z.string().trim().max(30).optional(),
  color: z.string().trim().max(40).optional(),
  model: z.string().trim().max(60).optional(),
  cost: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 160),
  description: optionalText,
  sku: requiredText("SKU", 60),
  barcode: z.string().trim().max(60).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z.enum(["UN", "KG", "LT", "MT", "CX", "PCT"]).default("UN"),
  cost: z.coerce.number().min(0, "Custo inválido."),
  price: z.coerce.number().min(0, "Preço inválido."),
  promoPrice: z.coerce.number().min(0).optional(),
  promoStart: optionalDateInput,
  promoEnd: optionalDateInput,
  minStock: z.coerce.number().min(0).default(0),
  maxStock: z.coerce.number().min(0).optional(),
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
  quantity: z.coerce.number().refine((v) => v !== 0, "Informe uma quantidade diferente de zero."),
  unitCost: z.coerce.number().min(0).optional(),
  reason: requiredText("Motivo", 300),
  document: z.string().trim().max(60).optional(),
});

export const stockTransferSchema = z.object({
  fromBranchId: idSchema,
  toBranchId: idSchema,
  productId: idSchema,
  variantId: z.string().optional(),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero."),
  reason: optionalText,
});

export const cartItemSchema = z.object({
  productId: idSchema,
  variantId: z.string().optional(),
  quantity: z.coerce.number().positive("Quantidade inválida."),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});

export const salePaymentSchema = z.object({
  paymentMethodId: idSchema,
  amount: z.coerce.number().positive("Valor do pagamento inválido."),
  installments: z.coerce.number().int().min(1).max(36).default(1),
  notes: z.string().trim().max(300).optional(),
});

export const saleSchema = z.object({
  branchId: idSchema,
  cashSessionId: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1, "Adicione ao menos um item."),
  payments: z.array(salePaymentSchema).default([]),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export const cashOpenSchema = z.object({
  branchId: idSchema,
  terminalName: requiredText("Terminal", 60),
  openingAmount: z.coerce.number().min(0),
  notes: z.string().trim().max(300).optional(),
});

export const cashMovementSchema = z.object({
  sessionId: idSchema,
  type: z.enum(["SUPRIMENTO", "SANGRIA"]),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  reason: requiredText("Motivo", 200),
});

export const cashCloseSchema = z.object({
  sessionId: idSchema,
  countedCash: z.coerce.number().min(0),
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
  installments: z.coerce.number().int().min(1).max(36).default(1),
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
  installments: z.coerce.number().int().min(1).max(36).default(1),
  notes: z.string().trim().max(500).optional(),
});

export const settlementSchema = z.object({
  id: idSchema,
  financialAccountId: idSchema,
  date: dateInput,
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  interest: z.coerce.number().min(0).default(0),
  penalty: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
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
  initialBalance: z.coerce.number().min(0).default(0),
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
  maxDiscountPercent: z.coerce.number().min(0).max(100).default(10),
  requireCustomerOnCredit: z.boolean().default(true),
});

export const planSchema = z.object({
  id: z.string().optional(),
  code: requiredText("Código", 30),
  name: requiredText("Nome", 80),
  description: z.string().trim().max(300).optional(),
  price: z.coerce.number().min(0),
  trialDays: z.coerce.number().int().min(0).max(365).default(14),
  maxUsers: z.coerce.number().int().min(1).optional(),
  maxBranches: z.coerce.number().int().min(1).optional(),
  maxProducts: z.coerce.number().int().min(1).optional(),
});

export const tenantSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  legalName: z.string().trim().max(160).optional(),
  document: documentSchema,
  email: optionalEmail,
  phone: phoneSchema,
  planId: idSchema,
  adminName: requiredText("Responsável", 120),
  adminEmail: emailSchema,
  adminPassword: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  trialDays: z.coerce.number().int().min(0).max(90).default(14),
});

export const platformChargeSchema = z.object({
  tenantId: idSchema,
  description: requiredText("Descrição", 160),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido."),
  amount: positiveMoneyInput,
  dueDate: dateInput,
  notes: z.string().trim().max(300).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PayableInput = z.infer<typeof payableSchema>;
export type ReceivableInput = z.infer<typeof receivableSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
