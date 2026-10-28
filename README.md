# Vendix — Vendeu, organizou, cresceu.

Plataforma SaaS multiempresa para operações comerciais de vestuário, calçados,
cosméticos e acessórios: PDV, estoque, vendas, financeiro, DRE e relatórios.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react
- **Banco**: PostgreSQL 18 + Prisma 6 (Neon em produção)
- **Autenticação**: NextAuth v5 (beta) com credenciais + recuperação por e-mail
- **Validação**: Zod · **Cálculo**: decimal.js (nunca float binário) · **Testes**: Vitest

## Funcionalidades implementadas

| Módulo | Rota | Status |
| --- | --- | --- |
| Dashboard | `/dashboard` | ✅ KPIs, gráficos, alertas |
| PDV | `/pdv` | ✅ caixa aberta, vendas, impressão 58/80mm |
| Caixa | `/pdv/caixa` | ✅ suprimentos/sangrias, fechamento, divergência |
| Vendas | `/vendas`, `/vendas/[id]`, `/comprovante/[token]` | ✅ listagem, detalhe, cancelamento, devoluções, comprovante público tokenizado |
| Clientes | `/clientes` | ✅ CRUD |
| Produtos | `/produtos`, `/produtos/[id]`, `/produtos/categorias` | ✅ CRUD, variantes, categorias, marcas |
| Estoque | `/estoque` | ✅ movimentações, contagens, alertas |
| Fornecedores | `/fornecedores` | ✅ CRUD |
| Financeiro | `/financeiro`, `/financeiro/contas`, `/financeiro/contas-a-pagar`, `/financeiro/contas-a-receber`, `/financeiro/fluxo-caixa`, `/financeiro/livro-caixa`, `/financeiro/transferencias` | ✅ contas, payables/receivables, fluxo de caixa, livro caixa, transferências |
| Relatórios | `/relatorios/vendas`, `/relatorios/estoque`, `/relatorios/financeiro`, `/relatorios/dre` | ✅ + export CSV em `/api/export/*` |
| Usuários | `/usuarios` | ✅ perfis, ativação |
| Configurações | `/configuracoes` | ✅ empresa, unidades, WhatsApp |
| Assinatura | `/assinatura` | ✅ planos e limites |
| Admin SaaS | `/admin` (+ sub-rotas) | ✅ tenants, planos, cobranças, avisos, auditoria |

## Regras de negócio críticas

- **Multi-tenant**: todo dado filtra por `tenantId` validado no servidor a partir da
  sessão (nunca aceito de input do cliente).
- **Dinheiro**: `Decimal(14,2)` + `decimal.js` com `ROUND_HALF_UP`; totais sempre
  com duas casas; quantidades `Decimal(14,3)`.
- **Transações**: vendas, baixas financeiras e estornos usam transação serializable
  com retry; número de documento via `DocumentCounter` atômico.
- **Estornos**: sem exclusão física — status/estorno vinculado a pagamento/lançamento.
- **DRE**: fórmulas documentadas em `src/services/dre-calculator.ts`.

## Como executar

```bash
npm install
npx prisma migrate dev      # ou: npm run prisma:deploy
npx prisma db seed           # ou: npm run db:seed
npm run dev
```

Seed de demonstração: `admin@demo.vendix.app` / `Demo@2026`.

## Testes

```bash
npm run test       # unitários (Vitest)
npm run typecheck
npm run build
```

Testes de integração de isolamento exigem `TEST_DATABASE_URL` apontando para um
PostgreSQL ativo; caso contrário são pulados.

## Documentação

- `docs/00-auditoria-etapa_1.md` — auditoria inicial e arquitetura
- `docs/01-deploy-vendix.md` — deploy, produção e operação

## Estado atual do delivery

Módulos de autenticação, PDV, vendas, estoque, financeiro, DRE, relatórios,
usuários, configurações, SaaS admin e PWA estão implementados com persistência
real. As pendências documentadas estão registradas no auditoria e no guia de deploy.
