import { getSupabase } from './supabase';
import {
  UserProfile,
  Tenant,
  Branch,
  Product,
  Customer,
  Sale,
  CashRegister,
  CashMovement,
  AccountPayable,
  AccountReceivable,
  Category,
  Brand,
  Supplier,
  StockMovement,
} from '../types';

/**
 * Checks whether Supabase is configured with valid URL and key
 */
export function isSupabaseConnected(): boolean {
  return getSupabase() !== null;
}

/**
 * Attempts cloud database authentication against Supabase user_profiles
 * Allows users to log in on any device (computer, tablet, smartphone)
 */
export async function authenticateWithDatabase(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Banco de dados Supabase não configurado.' };
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Query user_profiles in Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1);

    if (error) {
      console.warn('Erro ao consultar Supabase user_profiles:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Usuário não localizado no banco de dados.' };
    }

    const row = data[0];

    // Password verification (if password column exists)
    if (row.password && row.password !== pass) {
      return { success: false, error: 'Senha incorreta no banco de dados.' };
    }

    if (row.is_active === false) {
      return { success: false, error: 'Este usuário está inativo no banco de dados.' };
    }

    // Map DB snake_case to UserProfile camelCase
    const user: UserProfile = {
      id: row.id,
      tenantId: row.tenant_id,
      branchId: row.branch_id || undefined,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      password: row.password || pass,
      phone: row.phone || undefined,
      permissions: Array.isArray(row.permissions) ? row.permissions : ['pos_sale'],
      isActive: row.is_active ?? true,
      lastLoginAt: new Date().toISOString(),
    };

    // Update last_login_at in database
    supabase
      .from('user_profiles')
      .update({ last_login_at: user.lastLoginAt })
      .eq('id', user.id)
      .then();

    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha de comunicação com o banco de dados.' };
  }
}

/**
 * Fetch all tenant-specific data from Supabase with Row Level Security / tenant filtering
 * Filiais strictly only receive records matching their tenantId.
 */
export async function fetchTenantDataFromDatabase(
  tenantId: string,
  role: string
): Promise<{
  success: boolean;
  tenants?: Tenant[];
  branches?: Branch[];
  users?: UserProfile[];
  products?: Product[];
  customers?: Customer[];
  sales?: Sale[];
  cashRegisters?: CashRegister[];
  cashMovements?: CashMovement[];
  accountsPayable?: AccountPayable[];
  accountsReceivable?: AccountReceivable[];
  categories?: Category[];
  brands?: Brand[];
  suppliers?: Supplier[];
  stockMovements?: StockMovement[];
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase não conectado' };
  }

  try {
    const isSuper = role === 'superadmin';

    // 1. Tenants query
    let tenantsQuery = supabase.from('tenants').select('*');
    if (!isSuper) {
      tenantsQuery = tenantsQuery.eq('id', tenantId);
    }
    const { data: dbTenants } = await tenantsQuery;

    // 2. Branches query
    let branchesQuery = supabase.from('branches').select('*');
    if (!isSuper) {
      branchesQuery = branchesQuery.eq('tenant_id', tenantId);
    }
    const { data: dbBranches } = await branchesQuery;

    // 3. User Profiles query
    let usersQuery = supabase.from('user_profiles').select('*');
    if (!isSuper) {
      usersQuery = usersQuery.eq('tenant_id', tenantId);
    }
    const { data: dbUsers } = await usersQuery;

    // 4. Products query (Strictly isolated by tenant_id)
    let productsQuery = supabase.from('products').select('*');
    if (!isSuper) {
      productsQuery = productsQuery.eq('tenant_id', tenantId);
    }
    const { data: dbProducts } = await productsQuery;

    // 5. Customers query
    let customersQuery = supabase.from('customers').select('*');
    if (!isSuper) {
      customersQuery = customersQuery.eq('tenant_id', tenantId);
    }
    const { data: dbCustomers } = await customersQuery;

    // 6. Sales query
    let salesQuery = supabase.from('sales').select('*, sale_items(*), sale_payments(*)').order('created_at', { ascending: false }).limit(200);
    if (!isSuper) {
      salesQuery = salesQuery.eq('tenant_id', tenantId);
    }
    const { data: dbSales } = await salesQuery;

    // 7. Cash Registers query
    let registersQuery = supabase.from('cash_registers').select('*').order('opened_at', { ascending: false }).limit(50);
    if (!isSuper) {
      registersQuery = registersQuery.eq('tenant_id', tenantId);
    }
    const { data: dbRegisters } = await registersQuery;

    // 8. Accounts Payable query
    let payablesQuery = supabase.from('accounts_payable').select('*').order('due_date', { ascending: true });
    if (!isSuper) {
      payablesQuery = payablesQuery.eq('tenant_id', tenantId);
    }
    const { data: dbPayables } = await payablesQuery;

    // 9. Accounts Receivable query
    let receivablesQuery = supabase.from('accounts_receivable').select('*').order('due_date', { ascending: true });
    if (!isSuper) {
      receivablesQuery = receivablesQuery.eq('tenant_id', tenantId);
    }
    const { data: dbReceivables } = await receivablesQuery;

    // Map fetched DB rows to application types
    const tenants: Tenant[] = (dbTenants || []).map((t) => ({
      id: t.id,
      name: t.name,
      tradeName: t.trade_name || t.name,
      cnpjCpf: t.cnpj_cpf || '',
      email: t.email || '',
      phone: t.phone || '',
      planId: t.plan_id || 'plan-prata',
      status: t.status || 'active',
      trialEndsAt: t.trial_ends_at || '',
      currentPeriodEndsAt: t.current_period_ends_at || '',
      settings: {
        logoUrl: t.settings?.logo_url || t.settings?.logoUrl || t.logo_url || '',
        receiptFormat: t.settings?.receipt_format || t.settings?.receiptFormat || '80mm',
        receiptFooter: t.settings?.receipt_footer || t.settings?.receiptFooter || 'Obrigado pela preferência!',
        allowNegativeStock: t.settings?.allow_negative_stock ?? false,
        whatsappPhone: t.settings?.whatsapp_phone || '',
        whatsappMessageTemplate: t.settings?.whatsapp_message_template || '',
        autoPrintReceipt: t.settings?.auto_print ?? false,
        enableCrediario: t.settings?.enable_crediario ?? true,
      },
      createdAt: t.created_at || new Date().toISOString(),
    }));

    const branches: Branch[] = (dbBranches || []).map((b) => ({
      id: b.id,
      tenantId: b.tenant_id,
      name: b.name,
      code: b.code || '01',
      isMain: b.is_main ?? true,
      phone: b.phone || '',
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
    }));

    const users: UserProfile[] = (dbUsers || []).map((u) => ({
      id: u.id,
      tenantId: u.tenant_id,
      branchId: u.branch_id || undefined,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      password: u.password || '',
      phone: u.phone || undefined,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      isActive: u.is_active ?? true,
      lastLoginAt: u.last_login_at || undefined,
    }));

    const products: Product[] = (dbProducts || []).map((p) => ({
      id: p.id,
      tenantId: p.tenant_id,
      branchId: p.branch_id || undefined,
      name: p.name,
      description: p.description || '',
      sku: p.sku,
      barcode: p.barcode || '',
      categoryId: p.category_id || '',
      brandId: p.brand_id || '',
      supplierId: p.supplier_id || '',
      unitMeasure: p.unit_measure || 'UN',
      costPrice: Number(p.cost_price) || 0,
      salePrice: Number(p.sale_price) || 0,
      promoPrice: p.promo_price ? Number(p.promo_price) : undefined,
      promoStart: p.promo_start || undefined,
      promoEnd: p.promo_end || undefined,
      currentStock: Number(p.current_stock) || 0,
      minStock: Number(p.min_stock) || 0,
      maxStock: Number(p.max_stock) || 100,
      segment: p.segment || 'geral',
      imageUrl: p.image_url || undefined,
      isActive: p.is_active ?? true,
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    }));

    const customers: Customer[] = (dbCustomers || []).map((c) => ({
      id: c.id,
      tenantId: c.tenant_id,
      name: c.name,
      cnpjCpf: c.cnpj_cpf || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      address: c.address || '',
      creditLimit: Number(c.credit_limit) || 0,
      creditUsed: Number(c.credit_used) || 0,
      status: c.status || 'ativo',
      totalSpent: Number(c.total_spent) || 0,
      notes: c.notes || undefined,
      createdAt: c.created_at || new Date().toISOString(),
    }));

    const sales: Sale[] = (dbSales || []).map((s) => {
      const items = (s.sale_items || []).map((it: any) => ({
        id: it.id,
        productId: it.product_id,
        variantId: it.variant_id || undefined,
        productName: it.product_name,
        sku: it.sku || '',
        barcode: it.barcode || undefined,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || 0,
        unitCost: Number(it.unit_cost) || 0,
        discount: Number(it.discount) || 0,
        totalPrice: Number(it.total_price) || 0,
      }));

      const computedCost = items.reduce(
        (acc: number, it: any) => acc + (it.unitCost || 0) * (it.quantity || 1),
        0
      );

      return {
        id: s.id,
        tenantId: s.tenant_id,
        branchId: s.branch_id || '',
        cashRegisterId: s.cash_register_id || undefined,
        saleNumber: s.sale_number,
        customerId: s.customer_id || undefined,
        customerName: s.customer_name || 'Cliente Balcão',
        salespersonName: s.salesperson_name || undefined,
        cashierName: s.cashier_name || 'Operador',
        status: s.status || 'concluida',
        items,
        payments: (s.sale_payments || []).map((pay: any) => ({
          paymentMethod: pay.payment_method,
          amount: Number(pay.amount) || 0,
          installments: pay.installments || 1,
          changeAmount: Number(pay.change_amount) || 0,
        })),
        subtotal: Number(s.subtotal) || 0,
        discount: Number(s.discount) || 0,
        total: Number(s.total) || 0,
        costTotal: Number(s.cost_total) || computedCost,
        notes: s.notes || undefined,
        createdAt: s.created_at || new Date().toISOString(),
      };
    });

    return {
      success: true,
      tenants: tenants.length > 0 ? tenants : undefined,
      branches: branches.length > 0 ? branches : undefined,
      users: users.length > 0 ? users : undefined,
      products: products.length > 0 ? products : undefined,
      customers: customers.length > 0 ? customers : undefined,
      sales: sales.length > 0 ? sales : undefined,
    };
  } catch (err: any) {
    console.warn('Erro ao sincronizar dados com Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Persist user to Supabase
 */
export async function dbSaveUser(user: UserProfile): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        tenant_id: user.tenantId,
        branch_id: user.branchId || null,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        password: user.password || null,
        phone: user.phone || null,
        permissions: user.permissions || [],
        is_active: user.isActive,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Persist tenant (company) and its logo/settings to Supabase
 */
export async function dbSaveTenant(tenant: Tenant): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('tenants').upsert(
      {
        id: tenant.id,
        name: tenant.name,
        trade_name: tenant.tradeName,
        cnpj_cpf: tenant.cnpjCpf,
        email: tenant.email,
        phone: tenant.phone,
        plan_id: tenant.planId,
        status: tenant.status,
        logo_url: tenant.settings.logoUrl || null,
        settings: {
          logo_url: tenant.settings.logoUrl || '',
          receipt_format: tenant.settings.receiptFormat,
          receipt_footer: tenant.settings.receiptFooter,
          allow_negative_stock: tenant.settings.allowNegativeStock,
          whatsapp_phone: tenant.settings.whatsappPhone,
          whatsapp_message_template: tenant.settings.whatsappMessageTemplate,
          auto_print: tenant.settings.autoPrintReceipt,
          enable_crediario: tenant.settings.enableCrediario,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Persist product to Supabase with tenant_id isolation
 */
export async function dbSaveProduct(product: Product): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('products').upsert(
      {
        id: product.id,
        tenant_id: product.tenantId,
        branch_id: product.branchId || null,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode || null,
        category_id: product.categoryId || null,
        brand_id: product.brandId || null,
        supplier_id: product.supplierId || null,
        unit_measure: product.unitMeasure,
        cost_price: product.costPrice,
        sale_price: product.salePrice,
        current_stock: product.currentStock,
        min_stock: product.minStock,
        max_stock: product.maxStock,
        segment: product.segment,
        image_url: product.imageUrl || null,
        is_active: product.isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Persist sale, sale items, and sale payments to Supabase
 */
export async function dbSaveSale(sale: Sale): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // 1. Insert Sale record
    const paymentSummary = (sale.payments || []).map((p) => p.paymentMethod.toUpperCase()).join(', ');

    const { error: saleError } = await supabase.from('sales').upsert(
      {
        id: sale.id,
        tenant_id: sale.tenantId,
        branch_id: sale.branchId,
        cash_register_id: sale.cashRegisterId || null,
        sale_number: sale.saleNumber,
        customer_id: sale.customerId || null,
        customer_name: sale.customerName || null,
        salesperson_name: sale.salespersonName || null,
        cashier_name: sale.cashierName,
        status: sale.status,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        cost_total: sale.costTotal || 0,
        payment_method_summary: paymentSummary,
        notes: sale.notes || null,
        created_at: sale.createdAt,
      },
      { onConflict: 'id' }
    );

    if (saleError) return false;

    // 2. Insert items
    if (sale.items && sale.items.length > 0) {
      const itemsToInsert = sale.items.map((item) => ({
        id: item.id,
        tenant_id: sale.tenantId,
        sale_id: sale.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        product_name: item.productName,
        sku: item.sku,
        barcode: item.barcode || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        discount: item.discount,
        total_price: item.totalPrice,
      }));
      await supabase.from('sale_items').upsert(itemsToInsert, { onConflict: 'id' });
    }

    // 3. Insert payments
    if (sale.payments && sale.payments.length > 0) {
      const paymentsToInsert = sale.payments.map((p, idx) => ({
        id: `${sale.id}-pay-${idx}`,
        tenant_id: sale.tenantId,
        sale_id: sale.id,
        payment_method: p.paymentMethod,
        amount: p.amount,
        installments: p.installments,
        change_amount: p.changeAmount,
      }));
      await supabase.from('sale_payments').upsert(paymentsToInsert, { onConflict: 'id' });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Persist customer to Supabase
 */
export async function dbSaveCustomer(customer: Customer): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('customers').upsert(
      {
        id: customer.id,
        tenant_id: customer.tenantId,
        name: customer.name,
        cnpj_cpf: customer.cnpjCpf,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        email: customer.email,
        address: customer.address,
        credit_limit: customer.creditLimit,
        credit_used: customer.creditUsed,
        status: customer.status,
        total_spent: customer.totalSpent,
        notes: customer.notes || null,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}
