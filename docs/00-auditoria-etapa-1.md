# Etapa 1 — Auditoria técnica e plano de execução

Data: 27/10/2026 · Projeto alvo: `Vendix_PDV` · Projeto de referência: `..\ecclesia`

## 1. Situação encontrada

| Item | Resultado |
| --- | --- |
| `Vendix_PDV` | Diretório **vazio** (nenhum código, schema, migration ou configuração). |
| `ecclesia` | Projeto Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19 / PostgreSQL / Tailwind 4 / shadcn (radix-nova) / NextAuth v5 beta / Vitest, com 8 migrations e ~180 arquivos em `src`. |
| Banco local | PostgreSQL 18 instalado, porém o serviço local não inicia neste ambiente (falha de processo filho `0xC0000142`). O desenvolvimento usa `DATABASE_URL` externa (Neon) ou PostgreSQL acessível; migrations não foram executadas localmente. |
| Git | `Vendix_PDV` não é repositório. Nenhum commit foi feito. |

Conclusão: **não havia nada a preservar no Vendix**. Todo o código novo foi criado do zero, aproveitando
seletivamente padrões comprovados do Ecclesia (não funcionalidades de igreja).

## 2. O que foi reaproveitado do Ecclesia (com adaptação)

| Área | Origem | Decisão no Vendix |
| --- | --- | --- |
| Primitivas de UI (button, input, select, dialog, sheet, table, tabs, toast etc.) | `src/components/ui/*` | **Copiadas** (shadcn padrão), sem dependência de domínio. |
| Tema / tokens shadcn + Tailwind 4 | `src/app/globals.css` | **Reestruturado** com a paleta Vendix (#6D28D9, #FF6B6B, #0F172A, #E5E7EB). |
| Shell responsivo (sidebar desktop + drawer mobile) | `src/components/app-shell.tsx` | **Reescrito** para os módulos Vendix, mantendo o padrão de navegação e acessibilidade. |
| Autenticação Credentials + JWT (NextAuth v5) | `src/lib/auth.ts` | **Adaptada** para `tenantId`, `branchId`, `roleId`, permissões e bloqueio por assinatura. |
| Guardas de rota e RBAC no servidor | `src/lib/rbac.ts` | **Adaptado**: `requireTenant`, `requirePermission`, `can`. |
| Escopo de dados por sede/congregação | `src/lib/scope.ts` | **Substituído** por escopo `tenantId` + `branchId` fail-closed. |
| Auditoria | `src/services/audit.service.ts` | **Reaproveitado** (com `tenantId`, `ip`, `userAgent`). |
| Padrão de testes de isolamento | `src/services/isolation.test.ts` | **Reaproveitado como abordagem**: testes rodam somente contra banco de teste explícito (`TEST_DATABASE_URL`). |
| PWA (manifest, service worker, botão instalar) | `src/app/manifest.ts`, `src/components/pwa-register.tsx`, `install-app-button.tsx` | **Adaptados** com marca e cache conservador (sem cache de dados financeiros). |
| Formatação pt-BR | `src/lib/format.ts` | **Reaproveitada e estendida** (moeda, data, documento, telefone). |
| Upload/PDF/QR/multi-tenancy/planos | `src/services/*`, `r2`, planos, cobranças | **Padrões avaliados**. PDF por `@react-pdf` e upload R2 **não** foram copiados (dependem de credenciais); Vendix usa impressão/PDF via navegador e não implementa upload de arquivos nesta entrega. |

## 3. O que **não** foi reaproveitado

Membros, visitantes, dízimos, ofertas, cartas, carteirinhas, EBD, fechamento mensal eclesiástico,
estrutura sede/congregação e cobrança de igrejas. Nenhuma entidade, rota ou texto de igreja foi
transportado. O modelo financeiro do Vendix é próprio (contas a pagar/receber, livro caixa, DRE gerencial,
contas contábeis, centros de custo, conciliação).

## 4. Arquitetura definida para o Vendix

```
Next.js App Router (server components + server actions)
  └─ src/app/(app)      → área autenticada (tenant)
  └─ src/app/(auth)     → login / recuperação
  └─ src/app/admin      → superadministrador da plataforma
  └─ src/app/api        → exportações CSV, comprovante público tokenizado, health
src/services/*          → regras de negócio transacionais (Prisma)
src/lib/*               → auth, RBAC, tenant scope, dinheiro, datas, auditoria, cripto
src/modules/*           → regras puras testáveis (DRE, parcelamento, preço, recebimento)
prisma/schema.prisma    → 45+ modelos multi-tenant
```

Decisões críticas:

1. **Isolamento**: `tenantId` vem exclusivamente da sessão (JWT assinado). Nenhuma ação aceita
   `tenantId` do cliente. Serviços recebem `AuthContext` e filtram por `tenantId`; campos relacionados
   (produto, cliente, conta) são validados com `findFirst({ id, tenantId })`.
2. **Filial**: usuário pode ter `branchId`; quando presente, operações ficam restritas à filial. Sem
   filial, o escopo é toda a empresa.
3. **Dinheiro**: `Decimal(14,2)` no banco, `decimal.js` na aplicação, arredondamento comercial
   (half-up) em 2 casas. Nunca `float`.
4. **Venda**: transação atômica + `idempotencyKey` única por tenant + contador de documento por filial.
   Estoque só baixa em `CONCLUIDA` e uma única vez (`stockApplied`), com movimento rastreável.
5. **Financeiro**: baixa gera `LedgerEntry` e pagamento na mesma transação; estorno cria reversão
   vinculada (`reversalOfId`) e marca o pagamento como estornado. Transferências geram duas pernas
   vinculadas e não contam como receita/despesa.
6. **Competência x caixa**: DRE usa competência (vendas confirmadas + despesas de contas a pagar) e
   é separada do fluxo de caixa (lançamentos realizados + vencimentos projetados).
7. **Assinatura**: status/bloqueio validados no login e no guard de tenant; limites de plano
   (usuários/filiais/produtos) aplicados no servidor.

## 5. Plano de execução (com status)

| Etapa | Escopo | Status |
| --- | --- | --- |
| 1 | Auditoria e plano | **Concluída** (este documento) |
| 2 | Schema, migrations, auth, RBAC, isolamento | Em execução |
| 3 | Identidade visual, shell, dashboard | A implementar |
| 4 | Clientes, fornecedores, produtos/variações, estoque | A implementar |
| 5 | PDV, caixa, pagamentos, comprovante, leitor | A implementar |
| 6 | Financeiro integrado + DRE | A implementar |
| 7 | Usuários, configurações, relatórios, WhatsApp, SaaS admin | A implementar |
| 8 | Testes, lint, typecheck, build, isolamento | A implementar |
| 9 | README, deploy, PWA | A implementar |

## 6. Riscos e pendências conhecidos

- **Banco**: sem PostgreSQL acessível neste ambiente, migrations e testes de integração não puderam
  rodar aqui. O comando `npm run test` executa testes puros; testes de banco exigem
  `TEST_DATABASE_URL` apontando para um banco descartável.
- **Impressão térmica**: navegador não imprime silenciosamente sem agente local. Entrega: layout 58/80 mm,
  pré-visualização, impressão do navegador e PDF. Integração ESC/POS exige bridge local (documentada).
- **WhatsApp**: envio automático somente com Cloud API configurada (token no servidor). Sem credenciais,
  o sistema oferece link `wa.me` e registra o compartilhamento manual como tal.
- **Fiscal**: nenhum documento fiscal é emitido. Estrutura preparada, sem simular autorização/SAT/NFC-e.
- **E-mail**: recuperação de senha gera token seguro; envio depende de provedor configurado (link de
  desenvolvimento disponível apenas fora de produção).
