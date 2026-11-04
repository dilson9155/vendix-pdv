-- Avisos direcionados: lista de lojas destinatárias (vazio = todas as lojas).

ALTER TABLE "platform_notices"
    ADD COLUMN "tenantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
