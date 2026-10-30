-- ====================================================================
-- VENDIX - Row Level Security (RLS) & Multi-Tenant Isolation
-- Garantia de Isolamento Total por Tenant / Empresa (company_id)
-- ====================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Garantir coluna de senha e compatibilidade de company_id
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- Garantir campo logo_url nas configurações de tenants
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 3. Função para obter o tenant_id da sessão ativa
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função para definir o tenant_id da sessão ativa
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se o token JWT possui a role superadmin ou se o app setou a flag
    IF current_setting('app.current_user_role', true) = 'superadmin' THEN
        RETURN TRUE;
    END IF;
    IF auth.jwt() ->> 'role' = 'superadmin' THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ====================================================================
-- ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ====================================================================

ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- POLÍTICAS DE RLS: ISOLAMENTO TOTAL POR TENANT_ID (COMPANY_ID)
-- Filiais acessam estritamente dados da sua empresa. Super Admin vê tudo.
-- ====================================================================

-- Tabela: TENANTS
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL
    USING (
        id = get_current_tenant_id() 
        OR is_super_admin()
        OR get_current_tenant_id() IS NULL -- Permite listar para login se não selecionado
    )
    WITH CHECK (id = get_current_tenant_id() OR is_super_admin());

-- Tabela: BRANCHES (Filiais)
DROP POLICY IF EXISTS tenant_isolation_branches ON branches;
CREATE POLICY tenant_isolation_branches ON branches
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: USER_PROFILES (Usuários)
DROP POLICY IF EXISTS tenant_isolation_user_profiles ON user_profiles;
CREATE POLICY tenant_isolation_user_profiles ON user_profiles
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        OR is_super_admin()
        OR email = current_setting('app.current_user_email', true)
    )
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: PRODUCTS (Produtos)
DROP POLICY IF EXISTS tenant_isolation_products ON products;
CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: PRODUCT_VARIANTS (Variantes)
DROP POLICY IF EXISTS tenant_isolation_variants ON product_variants;
CREATE POLICY tenant_isolation_variants ON product_variants
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: CATEGORIES (Categorias)
DROP POLICY IF EXISTS tenant_isolation_categories ON categories;
CREATE POLICY tenant_isolation_categories ON categories
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: BRANDS (Marcas)
DROP POLICY IF EXISTS tenant_isolation_brands ON brands;
CREATE POLICY tenant_isolation_brands ON brands
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: SUPPLIERS (Fornecedores)
DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers;
CREATE POLICY tenant_isolation_suppliers ON suppliers
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: CUSTOMERS (Clientes & Crediário)
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: SALES (Vendas)
DROP POLICY IF EXISTS tenant_isolation_sales ON sales;
CREATE POLICY tenant_isolation_sales ON sales
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: SALE_ITEMS (Itens de Venda)
DROP POLICY IF EXISTS tenant_isolation_sale_items ON sale_items;
CREATE POLICY tenant_isolation_sale_items ON sale_items
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: SALE_PAYMENTS (Pagamentos de Venda)
DROP POLICY IF EXISTS tenant_isolation_sale_payments ON sale_payments;
CREATE POLICY tenant_isolation_sale_payments ON sale_payments
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: CASH_REGISTERS (Caixas PDV)
DROP POLICY IF EXISTS tenant_isolation_cash_registers ON cash_registers;
CREATE POLICY tenant_isolation_cash_registers ON cash_registers
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: CASH_MOVEMENTS (Sangrias e Suprimentos)
DROP POLICY IF EXISTS tenant_isolation_cash_movements ON cash_movements;
CREATE POLICY tenant_isolation_cash_movements ON cash_movements
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: ACCOUNTS_PAYABLE (Contas a Pagar)
DROP POLICY IF EXISTS tenant_isolation_accounts_payable ON accounts_payable;
CREATE POLICY tenant_isolation_accounts_payable ON accounts_payable
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: ACCOUNTS_RECEIVABLE (Contas a Receber)
DROP POLICY IF EXISTS tenant_isolation_accounts_receivable ON accounts_receivable;
CREATE POLICY tenant_isolation_accounts_receivable ON accounts_receivable
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: CASHBOOK_ENTRIES (Livro Caixa)
DROP POLICY IF EXISTS tenant_isolation_cashbook ON cashbook_entries;
CREATE POLICY tenant_isolation_cashbook ON cashbook_entries
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- Tabela: STOCK_MOVEMENTS (Movimentações de Estoque)
DROP POLICY IF EXISTS tenant_isolation_stock ON stock_movements;
CREATE POLICY tenant_isolation_stock ON stock_movements
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- ====================================================================
-- ÍNDICES DE PERFORMANCE E ISOLAMENTO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON user_profiles(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_tenant ON accounts_payable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_tenant ON accounts_receivable(tenant_id);

-- ====================================================================
-- SEED INICIAL: SUPER ADMIN EDILSON
-- Garante que o Super Admin exista em qualquer dispositivo conectado
-- ====================================================================
INSERT INTO user_profiles (
    id, tenant_id, full_name, email, role, password, is_active, permissions
) VALUES (
    'user-superadmin-edilson'::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Edilson (Super Admin)',
    'edilson9155@gmail.com',
    'superadmin',
    '91550748',
    true,
    '["all", "saas_admin", "pos_sale", "discounts", "cancel_sale", "finance", "inventory", "reports", "settings"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    role = 'superadmin',
    password = '91550748',
    email = 'edilson9155@gmail.com',
    is_active = true;
