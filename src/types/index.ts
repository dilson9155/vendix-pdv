export type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'stockist' | 'salesperson';

export type SegmentType = 'geral' | 'moda' | 'cosmeticos' | 'acessorios' | 'variedades';

export type PaymentMethodType = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'crediario' | 'outro';

export type SaleStatus = 'concluida' | 'cancelada' | 'devolvida';

export type FinancialStatus = 'aberto' | 'parcial' | 'pago' | 'recebido' | 'vencido' | 'cancelado';

export interface SaaSPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  features: string[];
  isActive: boolean;
}

export interface TenantSettings {
  logoUrl?: string;
  receiptFormat: '58mm' | '80mm';
  receiptFooter: string;
  allowNegativeStock: boolean;
  whatsappPhone: string;
  whatsappMessageTemplate: string;
  autoPrintReceipt: boolean;
  enableCrediario: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  tradeName: string;
  cnpjCpf: string;
  email: string;
  phone: string;
  planId: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trialEndsAt: string;
  currentPeriodEndsAt: string;
  settings: TenantSettings;
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  isMain: boolean;
  phone: string;
  address: string;
  city: string;
  state: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  branchId: string;
  email: string;
  password?: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  tradeName?: string;
  cnpjCpf?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  contactPerson?: string;
  city?: string;
  state?: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  tenantId: string;
  productId: string;
  sku: string;
  barcode: string;
  size?: string;
  color?: string;
  batchNumber?: string;
  expirationDate?: string;
  stockQuantity: number;
  costPrice?: number;
  salePrice?: number;
}

export interface Product {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  description?: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brandId?: string;
  supplierId?: string;
  unitMeasure: string; // UN, PC, PAR, etc.
  costPrice: number;
  salePrice: number;
  promoPrice?: number;
  promoStart?: string;
  promoEnd?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  segment: SegmentType;
  imageUrl?: string;
  variants?: ProductVariant[];
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  cnpjCpf: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  birthDate?: string;
  creditLimit: number;
  creditUsed: number;
  status: 'ativo' | 'inadimplente' | 'bloqueado';
  totalSpent: number;
  lastPurchaseAt?: string;
  notes?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantInfo?: string;
  movementType: 'entrada_compra' | 'saida_venda' | 'ajuste_inventario' | 'transferencia_saida' | 'transferencia_entrada' | 'devolucao_cliente' | 'devolucao_fornecedor';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceDoc?: string;
  reason: string;
  userName: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  tenantId: string;
  branchId: string;
  operatorId: string;
  operatorName: string;
  terminalName: string;
  status: 'aberto' | 'fechado';
  initialFloat: number;
  closingExpected?: number;
  closingCounted?: number;
  closingDifference?: number;
  notes?: string;
  openedAt: string;
  closedAt?: string;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  branchId: string;
  cashRegisterId: string;
  movementType: 'suprimento' | 'sangria';
  amount: number;
  reason: string;
  authorizedBy: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  totalPrice: number;
}

export interface SalePayment {
  paymentMethod: PaymentMethodType;
  amount: number;
  installments: number;
  changeAmount: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string;
  cashRegisterId?: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  salespersonName?: string;
  cashierName: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  items: SaleItem[];
  payments: SalePayment[];
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface FinancialAccount {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  accountType: 'caixa_fisico' | 'conta_corrente' | 'poupanca' | 'carteira_digital';
  initialBalance: number;
  currentBalance: number;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  isActive: boolean;
}

export interface ChartOfAccount {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  parentCode?: string;
  nature: 'receita' | 'despesa' | 'custo';
  accountType: 'sintetica' | 'analitica';
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  tenantId: string;
  branchId?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface AccountPayable {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId?: string;
  supplierName: string;
  description: string;
  documentNumber?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  parentPayableId?: string;
  amount: number;
  dueDate: string;
  competenceDate: string;
  status: 'aberto' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
  paidAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  discountAmount: number;
  financialAccountId?: string;
  chartAccountId?: string;
  costCenterId?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

export interface AccountReceivable {
  id: string;
  tenantId: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  saleId?: string;
  description: string;
  documentNumber?: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: 'aberto' | 'parcial' | 'recebido' | 'vencido' | 'cancelado';
  receivedAmount: number;
  interestAmount: number;
  discountAmount: number;
  financialAccountId?: string;
  chartAccountId?: string;
  costCenterId?: string;
  createdAt: string;
  receivedAt?: string;
}

export interface TenantBillingInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  invoiceNumber: string;
  amount: number;
  planName: string;
  billingCycle: 'mensal' | 'anual';
  dueDate: string;
  paidAt?: string;
  status: 'pago' | 'pendente' | 'vencido' | 'cancelado';
  paymentMethod: 'pix' | 'boleto' | 'cartao';
  pixCode?: string;
  notes?: string;
  createdAt: string;
}

export interface CashbookEntry {
  id: string;
  tenantId: string;
  branchId: string;
  financialAccountId: string;
  financialAccountName: string;
  entryType: 'entrada' | 'saida' | 'transferencia_interna';
  amount: number;
  description: string;
  chartAccountId?: string;
  chartAccountName?: string;
  costCenterId?: string;
  referenceType?: 'venda' | 'conta_pagar' | 'conta_receber' | 'suprimento' | 'sangria' | 'transferencia' | 'avulso';
  referenceId?: string;
  userName: string;
  entryDate: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  branchId?: string;
  userId?: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, any>;
  createdAt: string;
}
