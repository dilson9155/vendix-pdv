-- Cobranças SaaS: PIX (QR Code / copia e cola), boleto e link público de pagamento.

-- CreateEnum
CREATE TYPE "ChargeMethod" AS ENUM ('PIX', 'BOLETO', 'TRANSFERENCIA', 'OUTRO');

-- AlterTable
ALTER TABLE "tenant_charges"
    ADD COLUMN "boletoCode" TEXT,
    ADD COLUMN "boletoUrl" TEXT,
    ADD COLUMN "instructions" TEXT,
    ADD COLUMN "method" "ChargeMethod" NOT NULL DEFAULT 'PIX',
    ADD COLUMN "paidById" TEXT,
    ADD COLUMN "paymentUrl" TEXT,
    ADD COLUMN "pixBeneficiary" TEXT,
    ADD COLUMN "pixCity" TEXT,
    ADD COLUMN "pixKey" TEXT,
    ADD COLUMN "publicToken" TEXT;

-- Backfill do token público das cobranças já existentes (a coluna nasce sem
-- default porque o valor é gerado pela aplicação nas novas cobranças).
UPDATE "tenant_charges"
SET "publicToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "publicToken" IS NULL;

ALTER TABLE "tenant_charges" ALTER COLUMN "publicToken" SET NOT NULL;

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pixKey" TEXT,
    "pixKeyType" TEXT,
    "pixBeneficiary" TEXT,
    "pixCity" TEXT,
    "boletoInstructions" TEXT,
    "supportWhatsapp" TEXT,
    "billingDueDay" INTEGER NOT NULL DEFAULT 10,
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "autoSuspend" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_charges_publicToken_key" ON "tenant_charges"("publicToken");

-- CreateIndex
CREATE INDEX "tenant_charges_tenantId_status_idx" ON "tenant_charges"("tenantId", "status");
