-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ATIVA', 'VENCIDA', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NoticeLevel" AS ENUM ('INFO', 'ALERTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "GenericStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('UN', 'KG', 'LT', 'MT', 'CX', 'PCT');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'ESTORNO', 'INVENTARIO');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ABERTA', 'CONCLUIDA', 'CANCELADA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'CREDITO_LOJA', 'OUTROS');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('CONFIRMADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SUPRIMENTO', 'SANGRIA', 'VENDA', 'ESTORNO');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CAIXA', 'BANCO', 'CARTAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "ChartAccountNature" AS ENUM ('RECEITA', 'DESPESA', 'CUSTO', 'ATIVO', 'PASSIVO', 'PATRIMONIO');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('VENDA', 'RECEBIMENTO', 'PAGAMENTO', 'SUPRIMENTO', 'SANGRIA', 'TRANSFERENCIA', 'AJUSTE', 'DESPESA', 'RECEITA', 'ESTORNO');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('ABERTO', 'PARCIAL', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('ABERTO', 'PARCIAL', 'RECEBIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'CANCEL', 'REVERT', 'CLOSE', 'OPEN', 'CONFIRM');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "maxUsers" INTEGER,
    "maxBranches" INTEGER,
    "maxProducts" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ATIVO',
    "planId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_charges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT,
    "description" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "NoticeLevel" NOT NULL DEFAULT 'INFO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "GenericStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "system" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "branchId" TEXT,
    "roleId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "category" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NAO_CONFIGURADO',
    "lastCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_counters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT,
    "brandId" TEXT,
    "supplierId" TEXT,
    "unit" "ProductUnit" NOT NULL DEFAULT 'UN',
    "cost" DECIMAL(14,2) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "promoPrice" DECIMAL(14,2),
    "promoStart" TIMESTAMP(3),
    "promoEnd" TIMESTAMP(3),
    "minStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "maxStock" DECIMAL(14,3),
    "ncm" TEXT,
    "cest" TEXT,
    "origin" TEXT,
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "size" TEXT,
    "color" TEXT,
    "model" TEXT,
    "cost" DECIMAL(14,2),
    "price" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2),
    "balanceAfter" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "document" TEXT,
    "saleId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "financialAccountId" TEXT,
    "feePercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "requiresCustomer" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'ABERTA',
    "customerId" TEXT,
    "operatorId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paidTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "changeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "canceledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "description" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "methodKind" "PaymentKind" NOT NULL,
    "methodName" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "status" "SalePaymentStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "financialAccountId" TEXT,
    "transactionRef" TEXT,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "saleReturnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "terminalName" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'ABERTO',
    "openingAmount" DECIMAL(14,2) NOT NULL,
    "expectedCash" DECIMAL(14,2),
    "countedCash" DECIMAL(14,2),
    "difference" DECIMAL(14,2),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'CAIXA',
    "bankName" TEXT,
    "agency" TEXT,
    "accountNumber" TEXT,
    "initialBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "initialBalanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "ChartAccountNature" NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isAnalytic" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "financialAccountId" TEXT NOT NULL,
    "chartAccountId" TEXT,
    "costCenterId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "competenceDate" TIMESTAMP(3) NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "sourceType" "LedgerSourceType" NOT NULL,
    "sourceId" TEXT,
    "saleId" TEXT,
    "transferId" TEXT,
    "reversalOfId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "supplierId" TEXT,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "chartAccountId" TEXT,
    "costCenterId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "competenceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'ABERTO',
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "notes" TEXT,
    "createdById" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penalty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "method" TEXT,
    "document" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "chartAccountId" TEXT,
    "costCenterId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "competenceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'ABERTO',
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "notes" TEXT,
    "createdById" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penalty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "method" TEXT,
    "document" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_planId_idx" ON "tenants"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "tenant_charges_tenantId_referenceMonth_idx" ON "tenant_charges"("tenantId", "referenceMonth");

-- CreateIndex
CREATE INDEX "tenant_charges_status_dueDate_idx" ON "tenant_charges"("status", "dueDate");

-- CreateIndex
CREATE INDEX "platform_notices_active_publishedAt_idx" ON "platform_notices"("active", "publishedAt");

-- CreateIndex
CREATE INDEX "branches_tenantId_status_idx" ON "branches"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_code_key" ON "branches"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_name_key" ON "branches"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_active_idx" ON "users"("tenantId", "active");

-- CreateIndex
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_createdAt_idx" ON "password_reset_tokens"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key_key" ON "tenant_settings"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_tenantId_provider_key" ON "integrations"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_tenantId_idx" ON "api_keys"("tenantId");

-- CreateIndex
CREATE INDEX "document_counters_tenantId_idx" ON "document_counters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "document_counters_branchId_scope_key" ON "document_counters"("branchId", "scope");

-- CreateIndex
CREATE INDEX "customers_tenantId_name_idx" ON "customers"("tenantId", "name");

-- CreateIndex
CREATE INDEX "customers_tenantId_active_idx" ON "customers"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_document_key" ON "customers"("tenantId", "document");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_name_idx" ON "suppliers"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenantId_document_key" ON "suppliers"("tenantId", "document");

-- CreateIndex
CREATE INDEX "product_categories_tenantId_active_idx" ON "product_categories"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenantId_name_key" ON "product_categories"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenantId_name_key" ON "brands"("tenantId", "name");

-- CreateIndex
CREATE INDEX "products_tenantId_name_idx" ON "products"("tenantId", "name");

-- CreateIndex
CREATE INDEX "products_tenantId_active_idx" ON "products"("tenantId", "active");

-- CreateIndex
CREATE INDEX "products_tenantId_categoryId_idx" ON "products"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_sku_key" ON "products"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_barcode_key" ON "products"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_color_size_idx" ON "product_variants"("tenantId", "color", "size");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenantId_sku_key" ON "product_variants"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenantId_barcode_key" ON "product_variants"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "product_barcodes_productId_idx" ON "product_barcodes"("productId");

-- CreateIndex
CREATE INDEX "product_barcodes_variantId_idx" ON "product_barcodes"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_tenantId_code_key" ON "product_barcodes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "stock_levels_tenantId_productId_idx" ON "stock_levels"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_branchId_productId_variantId_key" ON "stock_levels"("branchId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_createdAt_idx" ON "stock_movements"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_branchId_productId_createdAt_idx" ON "stock_movements"("branchId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_saleId_idx" ON "stock_movements"("saleId");

-- CreateIndex
CREATE INDEX "payment_methods_tenantId_active_idx" ON "payment_methods"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_tenantId_name_key" ON "payment_methods"("tenantId", "name");

-- CreateIndex
CREATE INDEX "sales_tenantId_createdAt_idx" ON "sales"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_branchId_createdAt_idx" ON "sales"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_tenantId_customerId_idx" ON "sales"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "sales_tenantId_status_idx" ON "sales"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_documentNumber_key" ON "sales"("tenantId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_idempotencyKey_key" ON "sales"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_tenantId_productId_idx" ON "sale_items"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "sale_payments_saleId_idx" ON "sale_payments"("saleId");

-- CreateIndex
CREATE INDEX "sale_payments_tenantId_receivedAt_idx" ON "sale_payments"("tenantId", "receivedAt");

-- CreateIndex
CREATE INDEX "sale_returns_saleId_idx" ON "sale_returns"("saleId");

-- CreateIndex
CREATE INDEX "sale_returns_tenantId_createdAt_idx" ON "sale_returns"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "sale_return_items_saleReturnId_idx" ON "sale_return_items"("saleReturnId");

-- CreateIndex
CREATE INDEX "cash_sessions_tenantId_status_idx" ON "cash_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_sessions_branchId_status_idx" ON "cash_sessions"("branchId", "status");

-- CreateIndex
CREATE INDEX "cash_movements_sessionId_createdAt_idx" ON "cash_movements"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_movements_tenantId_createdAt_idx" ON "cash_movements"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "financial_accounts_tenantId_active_idx" ON "financial_accounts"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_tenantId_name_key" ON "financial_accounts"("tenantId", "name");

-- CreateIndex
CREATE INDEX "chart_accounts_tenantId_nature_idx" ON "chart_accounts"("tenantId", "nature");

-- CreateIndex
CREATE UNIQUE INDEX "chart_accounts_tenantId_code_key" ON "chart_accounts"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cost_centers_tenantId_active_idx" ON "cost_centers"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenantId_code_key" ON "cost_centers"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_reversalOfId_key" ON "ledger_entries"("reversalOfId");

-- CreateIndex
CREATE INDEX "ledger_entries_tenantId_date_idx" ON "ledger_entries"("tenantId", "date");

-- CreateIndex
CREATE INDEX "ledger_entries_financialAccountId_date_idx" ON "ledger_entries"("financialAccountId", "date");

-- CreateIndex
CREATE INDEX "ledger_entries_tenantId_sourceType_sourceId_idx" ON "ledger_entries"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ledger_entries_tenantId_competenceDate_idx" ON "ledger_entries"("tenantId", "competenceDate");

-- CreateIndex
CREATE INDEX "account_transfers_tenantId_date_idx" ON "account_transfers"("tenantId", "date");

-- CreateIndex
CREATE INDEX "payables_tenantId_dueDate_idx" ON "payables"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "payables_tenantId_status_idx" ON "payables"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payables_installmentGroupId_idx" ON "payables"("installmentGroupId");

-- CreateIndex
CREATE INDEX "payable_payments_payableId_idx" ON "payable_payments"("payableId");

-- CreateIndex
CREATE INDEX "payable_payments_tenantId_date_idx" ON "payable_payments"("tenantId", "date");

-- CreateIndex
CREATE INDEX "receivables_tenantId_dueDate_idx" ON "receivables"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "receivables_tenantId_status_idx" ON "receivables"("tenantId", "status");

-- CreateIndex
CREATE INDEX "receivables_customerId_idx" ON "receivables"("customerId");

-- CreateIndex
CREATE INDEX "receivables_saleId_idx" ON "receivables"("saleId");

-- CreateIndex
CREATE INDEX "receivables_installmentGroupId_idx" ON "receivables"("installmentGroupId");

-- CreateIndex
CREATE INDEX "receivable_payments_receivableId_idx" ON "receivable_payments"("receivableId");

-- CreateIndex
CREATE INDEX "receivable_payments_tenantId_date_idx" ON "receivable_payments"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_tokens_token_key" ON "receipt_tokens"("token");

-- CreateIndex
CREATE INDEX "receipt_tokens_saleId_idx" ON "receipt_tokens"("saleId");

-- CreateIndex
CREATE INDEX "whatsapp_logs_tenantId_createdAt_idx" ON "whatsapp_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_charges" ADD CONSTRAINT "tenant_charges_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_charges" ADD CONSTRAINT "tenant_charges_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_counters" ADD CONSTRAINT "document_counters_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "sale_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "account_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_tokens" ADD CONSTRAINT "receipt_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_tokens" ADD CONSTRAINT "receipt_tokens_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

