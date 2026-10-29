# VENDIX SaaS — Sistema de Gestão Comercial e PDV

> **"Vendeu, organizou, cresceu."**

Sistema SaaS de gestão comercial multiempresa de alta performance para lojas de roupas, calçados, maquiagens, cosméticos, bijuterias, bolsas, acessórios, presentes, utensílios domésticos e lojas de variedades.

---

## 🚀 Arquitetura e Tecnologias

- **Frontend & App:** React 19 + TypeScript + Vite + Tailwind CSS
- **Design System:** Paleta exclusiva Vendix (#6D28D9 Roxo, #FF6B6B Coral, #0F172A Dark Slate), tipografia Montserrat & Open Sans, Lucide Icons, Motion.
- **Banco de Dados:** Supabase PostgreSQL com isolamento multiempresa (`tenant_id` e `branch_id`) e políticas Row Level Security (RLS).
- **Controle Financeiro Rigoroso:** Cálculos decimais sem erro de ponto flutuante, DRE Gerencial, Fluxo de Caixa, Livro Caixa e Contas a Pagar/Receber.
- **PDV de Alta Velocidade:** Suporte a leitor de código de barras USB/Bluetooth em modo teclado (EAN-13, EAN-8, SKU), atalhos, múltiplas formas de pagamento (Pix, Dinheiro, Cartões, Crediário), controle de abertura/fechamento de caixa com conferência cega, sangria e suprimento.
- **Comprovantes Térmicos & WhatsApp:** Visualização e impressão formatada para 58mm e 80mm e compartilhamento via WhatsApp com link/resumo seguro.
- **Hospedagem & Deploy:** Compatível com Vercel, Netlify, Cloud Run e AI Studio.

---

## 📦 Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com).
2. Abra o **SQL Editor** do Supabase.
3. Copie e execute o conteúdo do arquivo:
   `supabase/migrations/20261028_vendix_schema_and_rls.sql`
4. Obtenha a URL do projeto e a Anon Key em **Project Settings > API**.
5. Configure suas variáveis de ambiente no arquivo `.env`:
   ```bash
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-anon-key"
   ```

---

## 💻 Instalação Local e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 🔒 Segurança e LGPD

- Isolamento rigoroso entre tenants via RLS no PostgreSQL.
- Auditoria de operações críticas (cancelamento de venda, estorno financeiro, sangrias).
- Nenhuma chave `service_role` exposta no bundle do navegador.
- Sanitização de dados de clientes e conformidade com privacidade.
