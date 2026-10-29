-- ====================================================================
-- VENDIX SaaS - Database Migration & Row Level Security (RLS)
-- Slogan: "Vendeu, organizou, cresceu."
-- Multi-tenant schema with isolation by tenant_id and branch_id
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SAAS PLANS
CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL DEFAULT 0,
    max_users INTEGER NOT NULL DEFAULT 2,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_products INTEGER NOT NULL DEFAULT 500,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TENANTS (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj_cpf VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    plan_id UUID REFERENCES saas_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    trial_ends_at TIMESTAMPTZ,
    current_period_ends_at TIMESTAMPTZ,
    settings JSONB NOT NULL DEFAULT '{
        "logo_url": "",
        "receipt_format": "80mm",
        "receipt_footer": "Obrigado pela preferência! Volte sempre.",
        "allow_negative_stock": false,
        "whatsapp_phone": "",
        "auto_print": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BRANCHES (Filiais / Unidades)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL DEFAULT 'MATRIZ',
    is_main BOOLEAN NOT NULL DEFAULT false,
    phone VARCHAR(30),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. USERS / PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier' CHECK (role IN ('superadmin', 'admin', 'manager', 'cashier', 'stockist', 'salesperson')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COST CENTERS (Centros de Custos)
CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CHART OF ACCOUNTS (Plano de Contas Gerencial)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    parent_code VARCHAR(50),
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('receita', 'despesa', 'custo')),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('sintetica', 'analitica')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. FINANCIAL ACCOUNTS (Contas Financeiras - Caixa da Loja, Contas Bancárias)
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('caixa_fisico', 'conta_corrente', 'poupanca', 'carteira_digital')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    bank_name VARCHAR(100),
    agency VARCHAR(50),
    account_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CATEGORIES, BRANDS, SUPPLIERS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj_cpf VARCHAR(20),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    contact_person VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CUSTOMERS (Clientes & Crediário)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    address VARCHAR(255),
    birth_date DATE,
    credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    credit_used NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inadimplente', 'bloqueado')),
    total_spent NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    last_purchase_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PRODUCTS (Produtos)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    unit_measure VARCHAR(20) NOT NULL DEFAULT 'UN',
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    promo_price NUMERIC(15, 2),
    promo_start DATE,
    promo_end DATE,
    current_stock NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    min_stock NUMERIC(15, 3) NOT NULL DEFAULT 5.000,
    max_stock NUMERIC(15, 3) NOT NULL DEFAULT 100.000,
    segment VARCHAR(50) NOT NULL DEFAULT 'geral' CHECK (segment IN ('geral', 'moda', 'cosmeticos', 'acessorios', 'variedades')),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PRODUCT VARIANTS (Grade de Tamanhos, Cores, Lote & Validade)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    batch_number VARCHAR(100),
    expiration_date DATE,
    stock_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    cost_price NUMERIC(15, 2),
    sale_price NUMERIC(15, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. STOCK MOVEMENTS (Entradas, Saídas, Balanço, Transferências)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'entrada_compra', 'saida_venda', 'ajuste_inventario',
        'transferencia_saida', 'transferencia_entrada',
        'devolucao_cliente', 'devolucao_fornecedor'
    )),
    quantity NUMERIC(15, 3) NOT NULL,
    previous_stock NUMERIC(15, 3) NOT NULL,
    new_stock NUMERIC(15, 3) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    reference_doc VARCHAR(100),
    reason TEXT NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. CASH REGISTERS (Sessões de Caixa PDV)
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    terminal_name VARCHAR(100) NOT NULL DEFAULT 'PDV-01',
    status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    initial_float NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    closing_expected NUMERIC(15, 2),
    closing_counted NUMERIC(15, 2),
    closing_difference NUMERIC(15, 2),
    notes TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 15. CASH MOVEMENTS (Suprimentos e Sangrias)
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('suprimento', 'sangria')),
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    authorized_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. SALES (Vendas)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    cash_register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
    sale_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    salesperson_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada', 'devolvida')),
    subtotal NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL,
    payment_method_summary VARCHAR(255),
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL
);

-- 18. SALE PAYMENTS
CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'crediario', 'outro')),
    amount NUMERIC(15, 2) NOT NULL,
    installments INTEGER NOT NULL DEFAULT 1,
    change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- 19. ACCOUNTS PAYABLE (Contas a Pagar)
CREATE TABLE IF NOT EXISTS accounts_payable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    competence_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'pago', 'vencido', 'cancelado')),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    penalty_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    financial_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    chart_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. ACCOUNTS RECEIVABLE (Contas a Receber)
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    installment_number INTEGER NOT NULL DEFAULT 1,
    total_installments INTEGER NOT NULL DEFAULT 1,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'recebido', 'vencido', 'cancelado')),
    received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    financial_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    chart_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. CASHBOOK ENTRIES (Livro Caixa)
CREATE TABLE IF NOT EXISTS cashbook_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    financial_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('entrada', 'saida', 'transferencia_interna')),
    amount NUMERIC(15, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    chart_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation
-- ====================================================================

-- Function to get current tenant_id from auth claim
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on all tenant-specific tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies (example for products & sales)
CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_sales ON sales
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_stock ON stock_movements
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_payable ON accounts_payable
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_receivable ON accounts_receivable
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR auth.jwt() ->> 'role' = 'superadmin')
    WITH CHECK (tenant_id = get_current_tenant_id());

-- Indexes for lightning fast queries and tenant isolation
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode ON products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_cpf ON customers(tenant_id, cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_payable_tenant_due ON accounts_payable(tenant_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_receivable_tenant_due ON accounts_receivable(tenant_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_cashbook_tenant_date ON cashbook_entries(tenant_id, entry_date DESC);
