-- Estoque sem variação passa a usar NULL (e não mais a string vazia),
-- permitindo que a FK para product_variants continue válida.
ALTER TABLE "stock_levels" ALTER COLUMN "variantId" DROP NOT NULL;
ALTER TABLE "stock_levels" ALTER COLUMN "variantId" DROP DEFAULT;
UPDATE "stock_levels" SET "variantId" = NULL WHERE "variantId" = '';

-- Postgres trata NULLs como distintos em índices únicos; este índice
-- funcional garante um único saldo por (filial, produto, variação/sem variação).
CREATE UNIQUE INDEX "stock_levels_branchId_productId_variantId_uidx"
  ON "stock_levels" ("branchId", "productId", COALESCE("variantId", ''));
