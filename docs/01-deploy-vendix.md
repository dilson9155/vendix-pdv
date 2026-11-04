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
| `CRON_SECRET` | Segredo enviado pelo cron da Vercel em `Authorization: Bearer`. |

3. Build: `npm run build` · Output padrão Next.js. O comando
   `vercel-build` roda `prisma migrate deploy` antes do build.
4. Domínio customizado + HTTPS automático.
5. Cron: `vercel.json` agenda `/api/cron/billing` diariamente às 08:00 UTC.
   Proteja o endpoint definindo `CRON_SECRET` na Vercel.

## Gestão de lojas e cobrança (SaaS)

1. Acesse `/admin/financeiro` e cadastre a **chave PIX** (CPF/CNPJ, e-mail,
   telefone ou aleatória), o beneficiário, a cidade, o dia de vencimento e a
   carência.
2. Em `/admin/empresas/nova`, cadastre a loja. O provisionamento cria matriz,
   perfis, usuário administrador, plano de contas, caixa e formas de pagamento.
3. Em `/admin/cobrancas/nova`, emita a mensalidade. Para PIX o QR Code e o
   copia e cola saem prontos; para boleto informe a linha digitável e/ou o PDF.
4. Copie o **link público** da cobrança (`/pagamento/[token]`) e envie à loja.
   O link funciona sem login e exibe PIX, boleto e instruções.
5. Ao confirmar o recebimento (“Marcar como paga”), a loja suspensa é reativada
   quando não restam outras cobranças em aberto.

> O Vendix gera o BR Code PIX localmente e não registra boleto em banco. Para
> boleto registrado, emita no seu internet banking e cole a linha digitável/PDF
> na cobrança. A baixa é manual (comprovante + “Marcar como paga”).

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
- **Cobrança SaaS**: PIX BR Code (EMV/CRC16) com QR Code SVG e copia e cola,
  boleto manual, link público tokenizado, suspensão/reativação automática e
  cron diário protegido por `CRON_SECRET`.
- **PWA**: instalável em desktop e celular; prompt nativo (`beforeinstallprompt`)
  com instruções para iOS e navegadores sem suporte; service worker só em produção.

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
