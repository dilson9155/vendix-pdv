# Deploy e operação — Vendix

## Banco de dados (Neon)

1. Crie um projeto PostgreSQL no Neon (região São Paulo ou mais próxima do Brasil).
2. `DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME?sslmode=require&pgbouncer=true&connection_limit=1"`
3. Aplicar migrações:

```bash
npx prisma migrate deploy
npx prisma db seed
```

> Em serverless (Vercel) recomenda-se PgBouncer + pooler; o driver PGlite não se
> aplica — o projeto usa driver `postgres` (node-postgres).

## Vercel

1. Importe o repositório no Vercel (framework preset: Next.js).
2. Variáveis de ambiente:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão Neon (com `sslmode=require`). |
| `AUTH_SECRET` | `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | URL pública da instância. |
| `SETTINGS_ENCRYPTION_KEY` | Chave AES-256-GCM base64 de 32 bytes. |
| `WHATSAPP_API_VERSION` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | Credenciais Cloud API (opcionais). |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail transacional (opcional). |
| `PASSWORD_RESET_DEV_LINK` | `false` em produção. |

3. Build: `npm run build` · Output padrão Next.js.
4. Domínio customizado + HTTPS automático.

## Variáveis opcionais por tenant

- `WHATSAPP_*`: sem credenciais, o envio usa link manual `wa.me` com token
  expirável (ver `src/services/whatsapp.service.ts`) — nunca expõe dados em link público.
- `SETTINGS_ENCRYPTION_KEY`: obrigatória para credenciais de integração salvas
  pelo painel do tenant.

## Funcionalidades críticas entregues

- **PDV**: sessão de caixa (abertura/fechamento com contagem e divergência),
  suprimentos/sangrias, emissão de documentos de venda. **Fora de escopo**: NFC-e e
  emissão fiscal eletrônica (decisão registrada no auditoria).
- **Comprovante**: token público `/comprovante/[token]` com dados limitados; impressão
  via navegador (`window.print`) com CSS `@media print` — promise de impressão silenciosa
  só é feita com bridge local/automação de impressora (documentado).
- **WhatsApp**: Cloud API real somente com credenciais; fallback `wa.me`; logs auditáveis.
- **Financeiro**: payables/receivables com juros/multas/descontos, estornos vinculados,
  transferências entre contas, fluxo de caixa (realizado + projeção), lançamentos manuais.
- **DRE**: receita bruta − deduções = receita líquida; CMV por custo real; despesas por
  competência (contas a pagar) + lançamentos manuais.

## Segurança e conformidade (LGPD)

- Senhas com hash bcrypt; reset por token com hash + expiração.
- RBAC por permissões carregadas por requisição (não apenas JWT).
- Tenant isolation server-side em toda leitura/escrita/exportação/relatório.
- Audit log em ações sensíveis (CREATE/UPDATE/DELETE/EXPORT/PRINT/CANCEL/REVERT…).
- Dados financeiros com Decimal; estornos por reversão (nunca deleção).
- Sem dados de terceiros em links públicos de comprovante.

## Pendências conhecidas

- Testes de integração de isolamento exigem banco ativo (`TEST_DATABASE_URL`).
- Impressão térmica em produção requer bridge/agent local (documentado).
- NFC-e/PDF fiscal fora de escopo por decisão de produto.
