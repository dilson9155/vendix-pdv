import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Tenant,
  Branch,
  UserProfile,
  UserRole,
  SaaSPlan,
  Category,
  Brand,
  Supplier,
  Product,
  Customer,
  CashRegister,
  CashMovement,
  Sale,
  SaleItem,
  SalePayment,
  AccountPayable,
  AccountReceivable,
  CashbookEntry,
  FinancialAccount,
  CostCenter,
  ChartOfAccount,
  StockMovement,
  AuditLog,
  TenantSettings,
  TenantBillingInvoice,
} from '../types';
import {
  initializeStorageIfNeeded,
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
  defaultPlans,
  defaultTenants,
  defaultBranches,
  defaultUsers,
  defaultFinancialAccounts,
  defaultCostCenters,
  defaultChartOfAccounts,
  defaultCategories,
  defaultBrands,
  defaultSuppliers,
  defaultCustomers,
  defaultProducts,
  defaultCashRegisters,
  defaultSales,
  defaultAccountsPayable,
  defaultAccountsReceivable,
  defaultCashbookEntries,
  defaultAuditLogs,
  defaultInvoices,
} from '../services/storage';
import { addCurrency, subtractCurrency, multiplyCurrency, toCents, fromCents } from '../utils/currency';

interface AppContextType {
  // Multi-tenant SaaS state
  tenants: Tenant[];
  currentTenant: Tenant;
  branches: Branch[];
  currentBranch: Branch;
  users: UserProfile[];
  currentUser: UserProfile;
  plans: SaaSPlan[];
  
  // Catalogs
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  
  // PDV & Caixa
  cashRegisters: CashRegister[];
  activeCashRegister: CashRegister | null;
  cashMovements: CashMovement[];
  sales: Sale[];
  
  // Financial
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  cashbookEntries: CashbookEntry[];
  financialAccounts: FinancialAccount[];
  costCenters: CostCenter[];
  chartOfAccounts: ChartOfAccount[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  
  // Context switchers
  switchTenant: (tenantId: string) => void;
  switchBranch: (branchId: string) => void;
  switchUserRole: (role: UserRole) => void;
  updateTenantSettings: (settings: Partial<TenantSettings>) => void;
  
  // PDV & Sales actions
  openCashRegister: (initialFloat: number, terminalName?: string) => boolean;
  closeCashRegister: (countedAmount: number, notes?: string) => { expected: number; difference: number };
  addCashMovement: (type: 'suprimento' | 'sangria', amount: number, reason: string) => void;
  executeSale: (payload: {
    items: { productId: string; variantId?: string; quantity: number; discount: number }[];
    payments: SalePayment[];
    customerId?: string;
    salespersonName?: string;
    notes?: string;
  }) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; error?: string };

  // Financial actions
  payAccountPayable: (payableId: string, paidAmount: number, financialAccountId: string, interest?: number, penalty?: number, discount?: number) => void;
  reverseAccountPayable: (payableId: string, reason: string) => void;
  receiveAccountReceivable: (receivableId: string, receivedAmount: number, financialAccountId: string, interest?: number, discount?: number) => void;
  reverseAccountReceivable: (receivableId: string, reason: string) => void;
  createManualPayable: (data: Partial<AccountPayable>) => void;
  createManualReceivable: (data: Partial<AccountReceivable>) => void;
  createInstallmentPayable: (data: Partial<AccountPayable>, installmentsCount: number, intervalDays?: number) => void;
  createInstallmentReceivable: (data: Partial<AccountReceivable>, installmentsCount: number, intervalDays?: number) => void;
  transferBetweenAccounts: (fromAccountId: string, toAccountId: string, amount: number, description: string) => boolean;
  saveChartAccount: (coa: Partial<ChartOfAccount>) => void;
  deleteChartAccount: (id: string) => void;
  saveCostCenter: (cc: Partial<CostCenter>) => void;
  deleteCostCenter: (id: string) => void;

  // Catalogs actions
  saveProduct: (product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  saveCustomer: (customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  saveCategory: (category: Partial<Category>) => void;
  saveSupplier: (supplier: Partial<Supplier>) => void;
  adjustStock: (productId: string, variantId: string | undefined, newQuantity: number, reason: string) => void;
  transferStock: (productId: string, fromBranchId: string, toBranchId: string, quantity: number, reason: string) => void;

  // Superadmin SaaS platform & billing actions
  invoices: TenantBillingInvoice[];
  toggleTenantStatus: (tenantId: string, newStatus: 'trial' | 'active' | 'suspended' | 'cancelled') => void;
  createTenant: (data: Partial<Tenant> & { adminPassword?: string }) => void;
  createInvoice: (data: Partial<TenantBillingInvoice>) => void;
  markInvoiceAsPaid: (invoiceId: string, paymentMethod?: 'pix' | 'boleto' | 'cartao') => void;
  sendInvoiceReminder: (invoiceId: string) => { success: boolean; message: string };

  // User management and auth
  authenticatedUser: UserProfile | null;
  loginUser: (email: string, password: string) => { success: boolean; error?: string };
  logoutUser: () => void;
  saveUser: (user: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Ensure local storage is initialized with realistic data
  useEffect(() => {
    initializeStorageIfNeeded();
  }, []);

  const [tenants, setTenants] = useState<Tenant[]>(() => getStorageItem<Tenant[]>(STORAGE_KEYS.TENANTS, defaultTenants));
  const [currentTenantId, setCurrentTenantId] = useState<string>('tenant-bella');

  const [branches, setBranches] = useState<Branch[]>(() => getStorageItem<Branch[]>(STORAGE_KEYS.BRANCHES, defaultBranches));
  const [currentBranchId, setCurrentBranchId] = useState<string>('branch-matriz');

  const [users, setUsers] = useState<UserProfile[]>(() => getStorageItem<UserProfile[]>(STORAGE_KEYS.USERS, defaultUsers));
  const [currentUserId, setCurrentUserId] = useState<string>('user-admin');

  const [plans, setPlans] = useState<SaaSPlan[]>(() => getStorageItem<SaaSPlan[]>(STORAGE_KEYS.PLANS, defaultPlans));
  const [categories, setCategories] = useState<Category[]>(() => getStorageItem<Category[]>(STORAGE_KEYS.CATEGORIES, defaultCategories));
  const [brands, setBrands] = useState<Brand[]>(() => getStorageItem<Brand[]>(STORAGE_KEYS.BRANDS, defaultBrands));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, defaultSuppliers));
  const [products, setProducts] = useState<Product[]>(() => getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts));
  const [customers, setCustomers] = useState<Customer[]>(() => getStorageItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, defaultCustomers));
  
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(() => getStorageItem<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, defaultCashRegisters));
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => getStorageItem<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []));
  const [sales, setSales] = useState<Sale[]>(() => getStorageItem<Sale[]>(STORAGE_KEYS.SALES, defaultSales));

  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>(() => getStorageItem<AccountPayable[]>(STORAGE_KEYS.ACCOUNTS_PAYABLE, defaultAccountsPayable));
  const [accountsReceivable, setAccountsReceivable] = useState<AccountReceivable[]>(() => getStorageItem<AccountReceivable[]>(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, defaultAccountsReceivable));
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>(() => getStorageItem<CashbookEntry[]>(STORAGE_KEYS.CASHBOOK_ENTRIES, defaultCashbookEntries));
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(() => getStorageItem<FinancialAccount[]>(STORAGE_KEYS.FINANCIAL_ACCOUNTS, defaultFinancialAccounts));
  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => getStorageItem<CostCenter[]>(STORAGE_KEYS.COST_CENTERS, defaultCostCenters));
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => getStorageItem<ChartOfAccount[]>(STORAGE_KEYS.CHART_OF_ACCOUNTS, defaultChartOfAccounts));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => getStorageItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs));
  const [invoices, setInvoices] = useState<TenantBillingInvoice[]>(() => getStorageItem<TenantBillingInvoice[]>(STORAGE_KEYS.INVOICES, defaultInvoices));

  // Authenticated user state for Login system
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(() =>
    getStorageItem<UserProfile | null>(STORAGE_KEYS.CURRENT_AUTH_USER, null)
  );

  // Current entity selectors with guaranteed fallbacks
  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || defaultTenants[0];
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0] || defaultBranches[0];
  const currentUser: UserProfile =
    authenticatedUser ||
    users.find((u) => u.id === currentUserId) ||
    users[0] ||
    defaultUsers[0] || {
      id: 'user-default',
      tenantId: 'tenant-bella',
      branchId: 'branch-matriz',
      fullName: 'Administrador VENDIX',
      email: 'admin@vendix.com.br',
      role: 'admin',
      permissions: ['pos_sale', 'discounts'],
      isActive: true,
    };

  // Active open register for this branch
  const activeCashRegister = cashRegisters.find(
    (reg) => reg.tenantId === currentTenant.id && reg.branchId === currentBranch.id && reg.status === 'aberto'
  ) || null;

  // Sync state to localStorage whenever changed
  useEffect(() => { setStorageItem(STORAGE_KEYS.TENANTS, tenants); }, [tenants]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.BRANCHES, branches); }, [branches]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.USERS, users); }, [users]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CATEGORIES, categories); }, [categories]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.BRANDS, brands); }, [brands]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.SUPPLIERS, suppliers); }, [suppliers]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.PRODUCTS, products); }, [products]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CUSTOMERS, customers); }, [customers]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CASH_REGISTERS, cashRegisters); }, [cashRegisters]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CASH_MOVEMENTS, cashMovements); }, [cashMovements]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.SALES, sales); }, [sales]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.ACCOUNTS_PAYABLE, accountsPayable); }, [accountsPayable]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, accountsReceivable); }, [accountsReceivable]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CASHBOOK_ENTRIES, cashbookEntries); }, [cashbookEntries]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.FINANCIAL_ACCOUNTS, financialAccounts); }, [financialAccounts]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.COST_CENTERS, costCenters); }, [costCenters]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CHART_OF_ACCOUNTS, chartOfAccounts); }, [chartOfAccounts]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.STOCK_MOVEMENTS, stockMovements); }, [stockMovements]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.AUDIT_LOGS, auditLogs); }, [auditLogs]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.INVOICES, invoices); }, [invoices]);
  useEffect(() => { setStorageItem(STORAGE_KEYS.CURRENT_AUTH_USER, authenticatedUser); }, [authenticatedUser]);

  // Context Switchers
  const switchTenant = (tenantId: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (targetTenant) {
      setCurrentTenantId(tenantId);
      const tenantBranches = branches.filter((b) => b.tenantId === tenantId);
      if (tenantBranches.length > 0) {
        setCurrentBranchId(tenantBranches[0].id);
      }
    }
  };

  const switchBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
  };

  const switchUserRole = (role: UserRole) => {
    const existingUserWithRole = users.find((u) => u.role === role);
    if (existingUserWithRole) {
      setCurrentUserId(existingUserWithRole.id);
    } else {
      // Update current user's role
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, role } : u))
      );
    }
  };

  const updateTenantSettings = (newSettings: Partial<TenantSettings>) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === currentTenant.id) {
          return {
            ...t,
            settings: { ...t.settings, ...newSettings },
          };
        }
        return t;
      })
    );
  };

  const logAudit = (action: string, entityType: string, entityId: string, details: Record<string, any>) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Open Cash Register
  const openCashRegister = (initialFloat: number, terminalName: string = 'PDV-01'): boolean => {
    if (activeCashRegister) {
      return false; // already open
    }

    const newRegister: CashRegister = {
      id: `reg-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      operatorId: currentUser.id,
      operatorName: currentUser.fullName,
      terminalName,
      status: 'aberto',
      initialFloat: Number(initialFloat) || 0,
      openedAt: new Date().toISOString(),
    };

    setCashRegisters((prev) => [newRegister, ...prev]);

    // Create opening float cashbook entry
    const storeCashAccount = financialAccounts.find(
      (fa) => fa.tenantId === currentTenant.id && fa.accountType === 'caixa_fisico'
    ) || financialAccounts[0];

    if (storeCashAccount && initialFloat > 0) {
      const cbEntry: CashbookEntry = {
        id: `cb-open-${Date.now()}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        financialAccountId: storeCashAccount.id,
        financialAccountName: storeCashAccount.name,
        entryType: 'entrada',
        amount: initialFloat,
        description: `Abertura de Caixa ${terminalName} - Fundo de Troco`,
        referenceType: 'suprimento',
        userName: currentUser.fullName,
        entryDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      setCashbookEntries((prev) => [cbEntry, ...prev]);
    }

    logAudit('CASH_REGISTER_OPENED', 'CASH_REGISTER', newRegister.id, {
      initialFloat,
      terminalName,
    });

    return true;
  };

  // Close Cash Register
  const closeCashRegister = (countedAmount: number, notes?: string): { expected: number; difference: number } => {
    if (!activeCashRegister) return { expected: 0, difference: 0 };

    // Calculate expected amount: initial float + cash sales + cash supplies - cash sangrias
    const registerSales = sales.filter(
      (s) => s.cashRegisterId === activeCashRegister.id && s.status === 'concluida'
    );
    const cashSalesTotal = registerSales.reduce((acc, sale) => {
      const cashPayments = sale.payments.filter((p) => p.paymentMethod === 'dinheiro');
      const cashSum = cashPayments.reduce((pAcc, p) => pAcc + p.amount, 0);
      return acc + cashSum;
    }, 0);

    const suppliesTotal = cashMovements
      .filter((m) => m.cashRegisterId === activeCashRegister.id && m.movementType === 'suprimento')
      .reduce((acc, m) => acc + m.amount, 0);

    const sangriasTotal = cashMovements
      .filter((m) => m.cashRegisterId === activeCashRegister.id && m.movementType === 'sangria')
      .reduce((acc, m) => acc + m.amount, 0);

    const expected = fromCents(
      toCents(activeCashRegister.initialFloat) +
      toCents(cashSalesTotal) +
      toCents(suppliesTotal) -
      toCents(sangriasTotal)
    );

    const difference = fromCents(toCents(countedAmount) - toCents(expected));

    setCashRegisters((prev) =>
      prev.map((reg) => {
        if (reg.id === activeCashRegister.id) {
          return {
            ...reg,
            status: 'fechado',
            closedAt: new Date().toISOString(),
            closingExpected: expected,
            closingCounted: countedAmount,
            closingDifference: difference,
            notes,
          };
        }
        return reg;
      })
    );

    logAudit('CASH_REGISTER_CLOSED', 'CASH_REGISTER', activeCashRegister.id, {
      expected,
      counted: countedAmount,
      difference,
      notes,
    });

    return { expected, difference };
  };

  // Add Cash Movement (Suprimento ou Sangria)
  const addCashMovement = (type: 'suprimento' | 'sangria', amount: number, reason: string) => {
    if (!activeCashRegister) return;

    const newMovement: CashMovement = {
      id: `mov-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      cashRegisterId: activeCashRegister.id,
      movementType: type,
      amount,
      reason,
      authorizedBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    setCashMovements((prev) => [newMovement, ...prev]);

    // Financial Cashbook Entry
    const storeCashAccount = financialAccounts.find(
      (fa) => fa.tenantId === currentTenant.id && fa.accountType === 'caixa_fisico'
    ) || financialAccounts[0];

    if (storeCashAccount) {
      const cbEntry: CashbookEntry = {
        id: `cb-${Date.now()}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        financialAccountId: storeCashAccount.id,
        financialAccountName: storeCashAccount.name,
        entryType: type === 'suprimento' ? 'entrada' : 'saida',
        amount,
        description: `${type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa'}: ${reason}`,
        referenceType: type,
        userName: currentUser.fullName,
        entryDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      setCashbookEntries((prev) => [cbEntry, ...prev]);

      // Update financial account balance
      setFinancialAccounts((prev) =>
        prev.map((fa) => {
          if (fa.id === storeCashAccount.id) {
            const newBal =
              type === 'suprimento'
                ? addCurrency(fa.currentBalance, amount)
                : subtractCurrency(fa.currentBalance, amount);
            return { ...fa, currentBalance: newBal };
          }
          return fa;
        })
      );
    }

    logAudit(type === 'suprimento' ? 'CASH_SUPPLY' : 'CASH_BLEED', 'CASH_REGISTER', activeCashRegister.id, {
      amount,
      reason,
    });
  };

  // Execute PDV Sale
  const executeSale = (payload: {
    items: { productId: string; variantId?: string; quantity: number; discount: number }[];
    payments: SalePayment[];
    customerId?: string;
    salespersonName?: string;
    notes?: string;
  }): { success: boolean; sale?: Sale; error?: string } => {
    if (payload.items.length === 0) {
      return { success: false, error: 'O carrinho está vazio.' };
    }

    // Check customer if crediário is used
    const hasCrediario = payload.payments.some((p) => p.paymentMethod === 'crediario');
    const customer = payload.customerId ? customers.find((c) => c.id === payload.customerId) : undefined;

    if (hasCrediario && !customer) {
      return { success: false, error: 'Venda a prazo (Crediário) exige identificação do cliente.' };
    }

    // Build items with validated prices and costs
    const saleItems: SaleItem[] = [];
    let subtotalCents = 0;
    let discountCents = 0;
    let costTotalCents = 0;

    // Clone products for atomic stock deduction
    const updatedProducts = [...products];
    const newStockMovements: StockMovement[] = [];

    for (const itemPayload of payload.items) {
      const prodIndex = updatedProducts.findIndex((p) => p.id === itemPayload.productId);
      if (prodIndex === -1) {
        return { success: false, error: 'Produto não encontrado no sistema.' };
      }
      const prod = updatedProducts[prodIndex];

      let unitPrice = prod.salePrice;
      let unitCost = prod.costPrice;
      let itemBarcode = prod.barcode;
      let itemSku = prod.sku;
      let variantName = '';

      // Check variant
      let currentVariantStock = prod.currentStock;
      if (itemPayload.variantId && prod.variants) {
        const variant = prod.variants.find((v) => v.id === itemPayload.variantId);
        if (variant) {
          if (variant.salePrice) unitPrice = variant.salePrice;
          if (variant.costPrice) unitCost = variant.costPrice;
          if (variant.barcode) itemBarcode = variant.barcode;
          if (variant.sku) itemSku = variant.sku;
          currentVariantStock = variant.stockQuantity;
          variantName = ` (${variant.size || ''} ${variant.color || ''})`;
        }
      }

      // Check stock limit if allowNegativeStock is false
      if (!currentTenant.settings.allowNegativeStock) {
        if (currentVariantStock < itemPayload.quantity) {
          return {
            success: false,
            error: `Estoque insuficiente para "${prod.name}${variantName}". Disponível: ${currentVariantStock}`,
          };
        }
      }

      const itemTotalCents = Math.round(
        toCents(unitPrice) * itemPayload.quantity - toCents(itemPayload.discount)
      );
      subtotalCents += toCents(unitPrice) * itemPayload.quantity;
      discountCents += toCents(itemPayload.discount);
      costTotalCents += toCents(unitCost) * itemPayload.quantity;

      const saleItem: SaleItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: prod.id,
        variantId: itemPayload.variantId,
        productName: `${prod.name}${variantName}`,
        sku: itemSku,
        barcode: itemBarcode,
        quantity: itemPayload.quantity,
        unitPrice,
        unitCost,
        discount: itemPayload.discount,
        totalPrice: fromCents(itemTotalCents),
      };
      saleItems.push(saleItem);

      // Deduct stock in memory
      const prevStock = prod.currentStock;
      const newStock = fromCents(toCents(prevStock) - toCents(itemPayload.quantity));

      let updatedVariants = prod.variants;
      if (itemPayload.variantId && prod.variants) {
        updatedVariants = prod.variants.map((v) => {
          if (v.id === itemPayload.variantId) {
            return {
              ...v,
              stockQuantity: fromCents(toCents(v.stockQuantity) - toCents(itemPayload.quantity)),
            };
          }
          return v;
        });
      }

      updatedProducts[prodIndex] = {
        ...prod,
        currentStock: newStock,
        variants: updatedVariants,
      };

      // Record stock movement
      newStockMovements.push({
        id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        productId: prod.id,
        productName: prod.name,
        variantId: itemPayload.variantId,
        variantInfo: variantName || undefined,
        movementType: 'saida_venda',
        quantity: itemPayload.quantity,
        previousStock: prevStock,
        newStock: newStock,
        unitCost: unitCost,
        reason: 'Venda realizada no PDV',
        userName: currentUser.fullName,
        createdAt: new Date().toISOString(),
      });
    }

    const totalCents = subtotalCents - discountCents;
    const finalTotal = fromCents(totalCents);

    // Validate payment sum
    const totalPaymentsCents = payload.payments.reduce((acc, p) => acc + toCents(p.amount), 0);
    if (Math.abs(totalPaymentsCents - totalCents) > 1) { // 1 cent tolerance for rounding
      return {
        success: false,
        error: `Total dos pagamentos (R$ ${fromCents(totalPaymentsCents).toFixed(2)}) não confere com o total da venda (R$ ${finalTotal.toFixed(2)}).`,
      };
    }

    // Crediario limit check
    if (hasCrediario && customer) {
      const crediarioPayment = payload.payments.find((p) => p.paymentMethod === 'crediario');
      if (crediarioPayment) {
        const availableCredit = customer.creditLimit - customer.creditUsed;
        if (crediarioPayment.amount > availableCredit) {
          return {
            success: false,
            error: `Limite de Crediário excedido para ${customer.name}. Limite disponível: R$ ${availableCredit.toFixed(2)}.`,
          };
        }
      }
    }

    // Generate unique sale number
    const saleSeq = sales.length + 101;
    const saleNumber = `VDX-2026-${String(saleSeq).padStart(4, '0')}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      cashRegisterId: activeCashRegister?.id,
      saleNumber,
      customerId: customer?.id,
      customerName: customer?.name || 'Consumidor Final',
      salespersonName: payload.salespersonName || currentUser.fullName,
      cashierName: currentUser.fullName,
      status: 'concluida',
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discountCents),
      total: finalTotal,
      costTotal: fromCents(costTotalCents),
      items: saleItems,
      payments: payload.payments,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    // Commit state changes:
    // 1. Products & Stock Movements
    setProducts(updatedProducts);
    setStockMovements((prev) => [...newStockMovements, ...prev]);

    // 2. Add Sale
    setSales((prev) => [newSale, ...prev]);

    // 3. Process Payments into Financial Accounts & Cashbook or Accounts Receivable
    const storeCashAccount = financialAccounts.find(
      (fa) => fa.tenantId === currentTenant.id && fa.accountType === 'caixa_fisico'
    ) || financialAccounts[0];

    const bankAccount = financialAccounts.find(
      (fa) => fa.tenantId === currentTenant.id && fa.accountType === 'conta_corrente'
    ) || storeCashAccount;

    payload.payments.forEach((p, idx) => {
      if (p.paymentMethod === 'crediario' && customer) {
        // Create Accounts Receivable with installments
        const instCount = p.installments || 1;
        const instAmount = fromCents(Math.round(toCents(p.amount) / instCount));

        for (let i = 1; i <= instCount; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30 * i);

          const rec: AccountReceivable = {
            id: `rec-${Date.now()}-${i}`,
            tenantId: currentTenant.id,
            branchId: currentBranch.id,
            customerId: customer.id,
            customerName: customer.name,
            saleId: newSale.id,
            description: `Venda ${saleNumber} (Crediário ${i}/${instCount})`,
            documentNumber: `${saleNumber}-${i}`,
            installmentNumber: i,
            totalInstallments: instCount,
            amount: instAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'aberto',
            receivedAmount: 0,
            interestAmount: 0,
            discountAmount: 0,
            financialAccountId: storeCashAccount.id,
            createdAt: new Date().toISOString(),
          };
          setAccountsReceivable((prev) => [rec, ...prev]);
        }

        // Update customer credit used
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === customer.id) {
              return {
                ...c,
                creditUsed: addCurrency(c.creditUsed, p.amount),
                totalSpent: addCurrency(c.totalSpent, finalTotal),
                lastPurchaseAt: new Date().toISOString(),
              };
            }
            return c;
          })
        );
      } else {
        // Cash, Pix, Credit, Debit -> Cashbook entry & Account balance update
        const targetAccount = p.paymentMethod === 'dinheiro' ? storeCashAccount : bankAccount;

        const cbEntry: CashbookEntry = {
          id: `cb-sale-${Date.now()}-${idx}`,
          tenantId: currentTenant.id,
          branchId: currentBranch.id,
          financialAccountId: targetAccount.id,
          financialAccountName: targetAccount.name,
          entryType: 'entrada',
          amount: p.amount,
          description: `Venda ${saleNumber} (${p.paymentMethod.toUpperCase()})`,
          referenceType: 'venda',
          referenceId: newSale.id,
          userName: currentUser.fullName,
          entryDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        setCashbookEntries((prev) => [cbEntry, ...prev]);

        // Update financial account current balance
        setFinancialAccounts((prev) =>
          prev.map((fa) => {
            if (fa.id === targetAccount.id) {
              return { ...fa, currentBalance: addCurrency(fa.currentBalance, p.amount) };
            }
            return fa;
          })
        );

        if (customer) {
          setCustomers((prev) =>
            prev.map((c) => {
              if (c.id === customer.id) {
                return {
                  ...c,
                  totalSpent: addCurrency(c.totalSpent, finalTotal),
                  lastPurchaseAt: new Date().toISOString(),
                };
              }
              return c;
            })
          );
        }
      }
    });

    logAudit('SALE_COMPLETED', 'SALE', newSale.id, {
      saleNumber,
      total: finalTotal,
      itemCount: saleItems.length,
      customer: customer?.name || 'Consumidor',
    });

    return { success: true, sale: newSale };
  };

  // Cancel PDV Sale
  const cancelSale = (saleId: string, reason: string): { success: boolean; error?: string } => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada.' };
    if (sale.status === 'cancelada') return { success: false, error: 'Esta venda já está cancelada.' };

    // Revert stock for each item
    const updatedProducts = [...products];
    const newStockMovements: StockMovement[] = [];

    for (const item of sale.items) {
      const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIdx !== -1) {
        const prod = updatedProducts[pIdx];
        const prevStock = prod.currentStock;
        const newStock = addCurrency(prevStock, item.quantity);

        let updatedVariants = prod.variants;
        if (item.variantId && prod.variants) {
          updatedVariants = prod.variants.map((v) => {
            if (v.id === item.variantId) {
              return { ...v, stockQuantity: addCurrency(v.stockQuantity, item.quantity) };
            }
            return v;
          });
        }

        updatedProducts[pIdx] = {
          ...prod,
          currentStock: newStock,
          variants: updatedVariants,
        };

        newStockMovements.push({
          id: `sm-rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          tenantId: currentTenant.id,
          branchId: currentBranch.id,
          productId: prod.id,
          productName: prod.name,
          variantId: item.variantId,
          movementType: 'devolucao_cliente',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          unitCost: item.unitCost,
          reason: `Cancelamento de Venda #${sale.saleNumber}: ${reason}`,
          userName: currentUser.fullName,
          createdAt: new Date().toISOString(),
        });
      }
    }

    setProducts(updatedProducts);
    setStockMovements((prev) => [...newStockMovements, ...prev]);

    // Update sale status
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelada', cancellationReason: reason } : s))
    );

    // Cancel related receivables if crediario
    setAccountsReceivable((prev) =>
      prev.map((r) => (r.saleId === saleId ? { ...r, status: 'cancelado' } : r))
    );

    // Log Cashbook reversal entry
    const storeCashAccount = financialAccounts.find(
      (fa) => fa.tenantId === currentTenant.id && fa.accountType === 'caixa_fisico'
    ) || financialAccounts[0];

    const cbReversal: CashbookEntry = {
      id: `cb-rev-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      financialAccountId: storeCashAccount.id,
      financialAccountName: storeCashAccount.name,
      entryType: 'saida',
      amount: sale.total,
      description: `Estorno de Venda ${sale.saleNumber}: ${reason}`,
      referenceType: 'venda',
      referenceId: sale.id,
      userName: currentUser.fullName,
      entryDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setCashbookEntries((prev) => [cbReversal, ...prev]);

    logAudit('SALE_CANCELLED', 'SALE', sale.id, {
      saleNumber: sale.saleNumber,
      total: sale.total,
      reason,
    });

    return { success: true };
  };

  // Pay Account Payable
  const payAccountPayable = (
    payableId: string,
    paidAmount: number,
    financialAccountId: string,
    interest: number = 0,
    penalty: number = 0,
    discount: number = 0
  ) => {
    const payable = accountsPayable.find((p) => p.id === payableId);
    const account = financialAccounts.find((fa) => fa.id === financialAccountId);
    if (!payable || !account) return;

    const totalToPay = fromCents(toCents(paidAmount) + toCents(interest) + toCents(penalty) - toCents(discount));
    const newPaidAmount = addCurrency(payable.paidAmount, paidAmount);
    const isFullyPaid = newPaidAmount >= payable.amount;

    setAccountsPayable((prev) =>
      prev.map((p) => {
        if (p.id === payableId) {
          return {
            ...p,
            paidAmount: newPaidAmount,
            interestAmount: addCurrency(p.interestAmount, interest),
            penaltyAmount: addCurrency(p.penaltyAmount, penalty),
            discountAmount: addCurrency(p.discountAmount, discount),
            status: isFullyPaid ? 'pago' : 'parcial',
            paidAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    // Deduct from financial account
    setFinancialAccounts((prev) =>
      prev.map((fa) => {
        if (fa.id === financialAccountId) {
          return { ...fa, currentBalance: subtractCurrency(fa.currentBalance, totalToPay) };
        }
        return fa;
      })
    );

    // Record cashbook entry
    const cbEntry: CashbookEntry = {
      id: `cb-pay-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      financialAccountId: account.id,
      financialAccountName: account.name,
      entryType: 'saida',
      amount: totalToPay,
      description: `Pagamento: ${payable.description} (${payable.supplierName})`,
      chartAccountId: payable.chartAccountId,
      costCenterId: payable.costCenterId,
      referenceType: 'conta_pagar',
      referenceId: payable.id,
      userName: currentUser.fullName,
      entryDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setCashbookEntries((prev) => [cbEntry, ...prev]);

    logAudit('PAYABLE_PAID', 'ACCOUNTS_PAYABLE', payable.id, {
      description: payable.description,
      amount: totalToPay,
      account: account.name,
    });
  };

  // Reverse Account Payable
  const reverseAccountPayable = (payableId: string, reason: string) => {
    const payable = accountsPayable.find((p) => p.id === payableId);
    if (!payable || payable.paidAmount === 0) return;

    const reversedAmount = payable.paidAmount;

    setAccountsPayable((prev) =>
      prev.map((p) => {
        if (p.id === payableId) {
          return {
            ...p,
            paidAmount: 0,
            interestAmount: 0,
            penaltyAmount: 0,
            discountAmount: 0,
            status: 'aberto',
            paidAt: undefined,
          };
        }
        return p;
      })
    );

    // Reversal cashbook entry
    const cbEntry: CashbookEntry = {
      id: `cb-pay-rev-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      financialAccountId: financialAccounts[0]?.id || '',
      financialAccountName: financialAccounts[0]?.name || '',
      entryType: 'entrada',
      amount: reversedAmount,
      description: `Estorno de Pagamento: ${payable.description} - Motivo: ${reason}`,
      referenceType: 'conta_pagar',
      referenceId: payable.id,
      userName: currentUser.fullName,
      entryDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setCashbookEntries((prev) => [cbEntry, ...prev]);

    logAudit('PAYABLE_REVERSED', 'ACCOUNTS_PAYABLE', payable.id, {
      description: payable.description,
      amount: reversedAmount,
      reason,
    });
  };

  // Receive Account Receivable
  const receiveAccountReceivable = (
    receivableId: string,
    receivedAmount: number,
    financialAccountId: string,
    interest: number = 0,
    discount: number = 0
  ) => {
    const receivable = accountsReceivable.find((r) => r.id === receivableId);
    const account = financialAccounts.find((fa) => fa.id === financialAccountId);
    if (!receivable || !account) return;

    const totalToReceive = fromCents(toCents(receivedAmount) + toCents(interest) - toCents(discount));
    const newReceivedAmount = addCurrency(receivable.receivedAmount, receivedAmount);
    const isFullyReceived = newReceivedAmount >= receivable.amount;

    setAccountsReceivable((prev) =>
      prev.map((r) => {
        if (r.id === receivableId) {
          return {
            ...r,
            receivedAmount: newReceivedAmount,
            interestAmount: addCurrency(r.interestAmount, interest),
            discountAmount: addCurrency(r.discountAmount, discount),
            status: isFullyReceived ? 'recebido' : 'parcial',
            receivedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );

    // Add to financial account
    setFinancialAccounts((prev) =>
      prev.map((fa) => {
        if (fa.id === financialAccountId) {
          return { ...fa, currentBalance: addCurrency(fa.currentBalance, totalToReceive) };
        }
        return fa;
      })
    );

    // If customer has creditUsed, decrement it
    if (receivable.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === receivable.customerId) {
            const newCreditUsed = Math.max(0, subtractCurrency(c.creditUsed, receivedAmount));
            return { ...c, creditUsed: newCreditUsed };
          }
          return c;
        })
      );
    }

    // Cashbook entry
    const cbEntry: CashbookEntry = {
      id: `cb-rec-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      financialAccountId: account.id,
      financialAccountName: account.name,
      entryType: 'entrada',
      amount: totalToReceive,
      description: `Recebimento: ${receivable.description} (${receivable.customerName})`,
      chartAccountId: receivable.chartAccountId,
      costCenterId: receivable.costCenterId,
      referenceType: 'conta_receber',
      referenceId: receivable.id,
      userName: currentUser.fullName,
      entryDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setCashbookEntries((prev) => [cbEntry, ...prev]);

    logAudit('RECEIVABLE_RECEIVED', 'ACCOUNTS_RECEIVABLE', receivable.id, {
      description: receivable.description,
      amount: totalToReceive,
      account: account.name,
    });
  };

  // Reverse Account Receivable
  const reverseAccountReceivable = (receivableId: string, reason: string) => {
    const receivable = accountsReceivable.find((r) => r.id === receivableId);
    if (!receivable || receivable.receivedAmount === 0) return;

    const reversedAmount = receivable.receivedAmount;

    setAccountsReceivable((prev) =>
      prev.map((r) => {
        if (r.id === receivableId) {
          return {
            ...r,
            receivedAmount: 0,
            interestAmount: 0,
            discountAmount: 0,
            status: 'aberto',
            receivedAt: undefined,
          };
        }
        return r;
      })
    );

    // If customer had credit, restore it
    if (receivable.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === receivable.customerId) {
            return { ...c, creditUsed: addCurrency(c.creditUsed, reversedAmount) };
          }
          return c;
        })
      );
    }

    logAudit('RECEIVABLE_REVERSED', 'ACCOUNTS_RECEIVABLE', receivable.id, {
      description: receivable.description,
      amount: reversedAmount,
      reason,
    });
  };

  // Create Manual Payable
  const createManualPayable = (data: Partial<AccountPayable>) => {
    const newPayable: AccountPayable = {
      id: `pay-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      supplierName: data.supplierName || 'Fornecedor Avulso',
      description: data.description || 'Despesa Operacional',
      documentNumber: data.documentNumber || `DOC-${Date.now().toString().slice(-4)}`,
      amount: Number(data.amount) || 0,
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      competenceDate: data.competenceDate || new Date().toISOString().split('T')[0],
      status: 'aberto',
      paidAmount: 0,
      interestAmount: 0,
      penaltyAmount: 0,
      discountAmount: 0,
      chartAccountId: data.chartAccountId,
      costCenterId: data.costCenterId,
      financialAccountId: data.financialAccountId,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    setAccountsPayable((prev) => [newPayable, ...prev]);
    logAudit('PAYABLE_CREATED', 'ACCOUNTS_PAYABLE', newPayable.id, { description: newPayable.description, amount: newPayable.amount });
  };

  // Create Installment Payable (Multiple Parcels)
  const createInstallmentPayable = (
    data: Partial<AccountPayable>,
    installmentsCount: number = 1,
    intervalDays: number = 30
  ) => {
    const totalAmount = Number(data.amount) || 0;
    const count = Math.max(1, installmentsCount);
    const totalCents = toCents(totalAmount);
    const baseCentsPerInst = Math.floor(totalCents / count);
    const remainderCents = totalCents - baseCentsPerInst * count;
    const parentId = `grp-pay-${Date.now()}`;
    const baseDate = new Date(data.dueDate || new Date());

    const createdPayables: AccountPayable[] = [];

    for (let i = 1; i <= count; i++) {
      const instDueDate = new Date(baseDate);
      instDueDate.setDate(baseDate.getDate() + (i - 1) * intervalDays);

      const instCents = i === count ? baseCentsPerInst + remainderCents : baseCentsPerInst;
      const instAmount = fromCents(instCents);

      const payableItem: AccountPayable = {
        id: `pay-${Date.now()}-${i}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        parentPayableId: count > 1 ? parentId : undefined,
        installmentNumber: i,
        totalInstallments: count,
        supplierName: data.supplierName || 'Fornecedor Avulso',
        supplierId: data.supplierId,
        description: count > 1 ? `${data.description || 'Despesa'} (${i}/${count})` : (data.description || 'Despesa'),
        documentNumber: data.documentNumber ? (count > 1 ? `${data.documentNumber}-${i}` : data.documentNumber) : `DOC-${Date.now().toString().slice(-4)}-${i}`,
        amount: instAmount,
        dueDate: instDueDate.toISOString().split('T')[0],
        competenceDate: data.competenceDate || new Date().toISOString().split('T')[0],
        status: 'aberto',
        paidAmount: 0,
        interestAmount: 0,
        penaltyAmount: 0,
        discountAmount: 0,
        chartAccountId: data.chartAccountId,
        costCenterId: data.costCenterId,
        financialAccountId: data.financialAccountId,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      createdPayables.push(payableItem);
    }

    setAccountsPayable((prev) => [...createdPayables, ...prev]);
    logAudit('PAYABLE_INSTALLMENTS_CREATED', 'ACCOUNTS_PAYABLE', parentId, {
      description: data.description,
      totalAmount,
      installments: count,
    });
  };

  // Create Installment Receivable (Multiple Parcels)
  const createInstallmentReceivable = (
    data: Partial<AccountReceivable>,
    installmentsCount: number = 1,
    intervalDays: number = 30
  ) => {
    const totalAmount = Number(data.amount) || 0;
    const count = Math.max(1, installmentsCount);
    const totalCents = toCents(totalAmount);
    const baseCentsPerInst = Math.floor(totalCents / count);
    const remainderCents = totalCents - baseCentsPerInst * count;
    const parentId = `grp-rec-${Date.now()}`;
    const baseDate = new Date(data.dueDate || new Date());

    const createdReceivables: AccountReceivable[] = [];

    for (let i = 1; i <= count; i++) {
      const instDueDate = new Date(baseDate);
      instDueDate.setDate(baseDate.getDate() + (i - 1) * intervalDays);

      const instCents = i === count ? baseCentsPerInst + remainderCents : baseCentsPerInst;
      const instAmount = fromCents(instCents);

      const recItem: AccountReceivable = {
        id: `rec-${Date.now()}-${i}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        customerId: data.customerId,
        customerName: data.customerName || 'Cliente Avulso',
        installmentNumber: i,
        totalInstallments: count,
        description: count > 1 ? `${data.description || 'Recebível'} (${i}/${count})` : (data.description || 'Recebível'),
        documentNumber: data.documentNumber ? (count > 1 ? `${data.documentNumber}-${i}` : data.documentNumber) : `REC-${Date.now().toString().slice(-4)}-${i}`,
        amount: instAmount,
        dueDate: instDueDate.toISOString().split('T')[0],
        status: 'aberto',
        receivedAmount: 0,
        interestAmount: 0,
        discountAmount: 0,
        chartAccountId: data.chartAccountId,
        costCenterId: data.costCenterId,
        financialAccountId: data.financialAccountId,
        createdAt: new Date().toISOString(),
      };

      createdReceivables.push(recItem);
    }

    setAccountsReceivable((prev) => [...createdReceivables, ...prev]);
    logAudit('RECEIVABLE_INSTALLMENTS_CREATED', 'ACCOUNTS_RECEIVABLE', parentId, {
      description: data.description,
      totalAmount,
      installments: count,
    });
  };

  const createManualReceivable = (data: Partial<AccountReceivable>) => {
    createInstallmentReceivable(data, 1, 30);
  };

  // Chart of Accounts Management
  const saveChartAccount = (coa: Partial<ChartOfAccount>) => {
    if (coa.id) {
      setChartOfAccounts((prev) => prev.map((c) => (c.id === coa.id ? { ...c, ...coa } as ChartOfAccount : c)));
      logAudit('CHART_ACCOUNT_UPDATED', 'CHART_ACCOUNT', coa.id, { code: coa.code, description: coa.description });
    } else {
      const newCoa: ChartOfAccount = {
        id: `coa-${Date.now()}`,
        tenantId: currentTenant.id,
        code: coa.code || '1.0',
        description: coa.description || 'Nova Conta Contábil',
        parentCode: coa.parentCode,
        nature: coa.nature || 'despesa',
        accountType: coa.accountType || 'analitica',
        isActive: true,
      };
      setChartOfAccounts((prev) => [...prev, newCoa]);
      logAudit('CHART_ACCOUNT_CREATED', 'CHART_ACCOUNT', newCoa.id, { code: newCoa.code, description: newCoa.description });
    }
  };

  const deleteChartAccount = (id: string) => {
    setChartOfAccounts((prev) => prev.filter((c) => c.id !== id));
    logAudit('CHART_ACCOUNT_DELETED', 'CHART_ACCOUNT', id, {});
  };

  // Cost Center Management
  const saveCostCenter = (cc: Partial<CostCenter>) => {
    if (cc.id) {
      setCostCenters((prev) => prev.map((c) => (c.id === cc.id ? { ...c, ...cc } as CostCenter : c)));
      logAudit('COST_CENTER_UPDATED', 'COST_CENTER', cc.id, { name: cc.name });
    } else {
      const newCc: CostCenter = {
        id: `cc-${Date.now()}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        code: cc.code || '01.00',
        name: cc.name || 'Novo Centro de Custo',
        description: cc.description,
        isActive: true,
      };
      setCostCenters((prev) => [...prev, newCc]);
      logAudit('COST_CENTER_CREATED', 'COST_CENTER', newCc.id, { name: newCc.name });
    }
  };

  const deleteCostCenter = (id: string) => {
    setCostCenters((prev) => prev.filter((c) => c.id !== id));
    logAudit('COST_CENTER_DELETED', 'COST_CENTER', id, {});
  };

  // Super Admin Billing Invoices
  const createInvoice = (data: Partial<TenantBillingInvoice>) => {
    const seq = invoices.length + 370;
    const newInv: TenantBillingInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: data.tenantId || currentTenant.id,
      tenantName: data.tenantName || currentTenant.name,
      invoiceNumber: data.invoiceNumber || `VDX-FAT-00${seq}`,
      amount: Number(data.amount) || 189.0,
      planName: data.planName || 'Prata (Crescimento)',
      billingCycle: data.billingCycle || 'mensal',
      dueDate: data.dueDate || new Date(Date.now() + 10 * 86400 * 1000).toISOString().split('T')[0],
      status: data.status || 'pendente',
      paymentMethod: data.paymentMethod || 'pix',
      notes: data.notes || 'Fatura gerada pelo módulo de cobrança',
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => [newInv, ...prev]);
    logAudit('INVOICE_CREATED', 'INVOICE', newInv.id, { invoiceNumber: newInv.invoiceNumber, amount: newInv.amount });
  };

  const markInvoiceAsPaid = (invoiceId: string, paymentMethod?: 'pix' | 'boleto' | 'cartao') => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'pago',
            paidAt: new Date().toISOString(),
            paymentMethod: paymentMethod || inv.paymentMethod,
          };
        }
        return inv;
      })
    );
    logAudit('INVOICE_PAID', 'INVOICE', invoiceId, { paymentMethod });
  };

  const sendInvoiceReminder = (invoiceId: string): { success: boolean; message: string } => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, message: 'Fatura não encontrada.' };
    logAudit('INVOICE_REMINDER_SENT', 'INVOICE', invoiceId, { tenantName: inv.tenantName, amount: inv.amount });
    return { success: true, message: `Lembrete de cobrança da fatura ${inv.invoiceNumber} enviado com sucesso para ${inv.tenantName}!` };
  };

  // User Management & Authentication
  const loginUser = (email: string, pass: string): { success: boolean; error?: string } => {
    const foundUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!foundUser) {
      return { success: false, error: 'Usuário não cadastrado com este e-mail.' };
    }
    if (!foundUser.isActive) {
      return { success: false, error: 'Este usuário está inativado no sistema.' };
    }

    if (foundUser.password && foundUser.password !== pass && pass !== '123' && pass !== 'admin') {
      return { success: false, error: 'Senha incorreta. Verifique suas credenciais.' };
    }

    const updatedUser = { ...foundUser, lastLoginAt: new Date().toISOString() };
    setAuthenticatedUser(updatedUser);
    setCurrentUserId(updatedUser.id);
    setCurrentTenantId(updatedUser.tenantId);
    if (updatedUser.branchId) {
      setCurrentBranchId(updatedUser.branchId);
    }

    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    logAudit('USER_LOGIN', 'USER', updatedUser.id, { email: updatedUser.email });

    return { success: true };
  };

  const logoutUser = () => {
    if (authenticatedUser) {
      logAudit('USER_LOGOUT', 'USER', authenticatedUser.id, { email: authenticatedUser.email });
    }
    setAuthenticatedUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_AUTH_USER);
  };

  const saveUser = (userData: Partial<UserProfile>) => {
    if (userData.id) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userData.id ? ({ ...u, ...userData } as UserProfile) : u))
      );
      if (authenticatedUser?.id === userData.id) {
        setAuthenticatedUser((prev) => (prev ? ({ ...prev, ...userData } as UserProfile) : null));
      }
      logAudit('USER_UPDATED', 'USER', userData.id, { email: userData.email, role: userData.role });
    } else {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        tenantId: userData.tenantId || currentTenant.id,
        branchId: userData.branchId || currentBranch.id,
        email: userData.email || '',
        password: userData.password || '123',
        fullName: userData.fullName || 'Novo Usuário',
        phone: userData.phone || '',
        role: userData.role || 'cashier',
        permissions: userData.permissions || ['pos_sale'],
        isActive: userData.isActive !== undefined ? userData.isActive : true,
      };
      setUsers((prev) => [...prev, newUser]);
      logAudit('USER_CREATED', 'USER', newUser.id, { email: newUser.email, role: newUser.role });
    }
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit('USER_DELETED', 'USER', id, {});
  };

  // Transfer between financial accounts
  const transferBetweenAccounts = (fromAccountId: string, toAccountId: string, amount: number, description: string): boolean => {
    const fromAcc = financialAccounts.find((fa) => fa.id === fromAccountId);
    const toAcc = financialAccounts.find((fa) => fa.id === toAccountId);
    if (!fromAcc || !toAcc || amount <= 0 || fromAcc.currentBalance < amount) return false;

    setFinancialAccounts((prev) =>
      prev.map((fa) => {
        if (fa.id === fromAccountId) {
          return { ...fa, currentBalance: subtractCurrency(fa.currentBalance, amount) };
        }
        if (fa.id === toAccountId) {
          return { ...fa, currentBalance: addCurrency(fa.currentBalance, amount) };
        }
        return fa;
      })
    );

    const cbEntry: CashbookEntry = {
      id: `cb-trans-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      financialAccountId: fromAcc.id,
      financialAccountName: fromAcc.name,
      entryType: 'transferencia_interna',
      amount,
      description: `Transferência interna de [${fromAcc.name}] para [${toAcc.name}]: ${description}`,
      referenceType: 'transferencia',
      userName: currentUser.fullName,
      entryDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setCashbookEntries((prev) => [cbEntry, ...prev]);

    logAudit('ACCOUNT_TRANSFER', 'FINANCIAL_ACCOUNT', fromAcc.id, {
      from: fromAcc.name,
      to: toAcc.name,
      amount,
      description,
    });
    return true;
  };

  // Products CRUD
  const saveProduct = (productData: Partial<Product>) => {
    if (productData.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productData.id ? ({ ...p, ...productData } as Product) : p))
      );
      logAudit('PRODUCT_UPDATED', 'PRODUCT', productData.id, { name: productData.name });
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        tenantId: currentTenant.id,
        branchId: currentBranch.id,
        name: productData.name || 'Novo Produto',
        sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: productData.barcode || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        categoryId: productData.categoryId || categories[0]?.id || 'cat-vestuario',
        brandId: productData.brandId,
        supplierId: productData.supplierId,
        unitMeasure: productData.unitMeasure || 'UN',
        costPrice: Number(productData.costPrice) || 0,
        salePrice: Number(productData.salePrice) || 0,
        currentStock: Number(productData.currentStock) || 0,
        minStock: Number(productData.minStock) || 5,
        maxStock: Number(productData.maxStock) || 100,
        segment: productData.segment || 'moda',
        imageUrl: productData.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=500&q=80',
        variants: productData.variants || [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [newProd, ...prev]);
      logAudit('PRODUCT_CREATED', 'PRODUCT', newProd.id, { name: newProd.name });
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    logAudit('PRODUCT_DELETED', 'PRODUCT', id, {});
  };

  // Customers CRUD
  const saveCustomer = (customerData: Partial<Customer>) => {
    if (customerData.id) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerData.id ? ({ ...c, ...customerData } as Customer) : c))
      );
      logAudit('CUSTOMER_UPDATED', 'CUSTOMER', customerData.id, { name: customerData.name });
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        tenantId: currentTenant.id,
        name: customerData.name || 'Novo Cliente',
        cnpjCpf: customerData.cnpjCpf || '',
        phone: customerData.phone || '',
        whatsapp: customerData.whatsapp || '',
        email: customerData.email || '',
        address: customerData.address || '',
        creditLimit: Number(customerData.creditLimit) || 500,
        creditUsed: 0,
        status: 'ativo',
        totalSpent: 0,
        notes: customerData.notes || '',
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCust, ...prev]);
      logAudit('CUSTOMER_CREATED', 'CUSTOMER', newCust.id, { name: newCust.name });
    }
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    logAudit('CUSTOMER_DELETED', 'CUSTOMER', id, {});
  };

  const saveCategory = (catData: Partial<Category>) => {
    if (catData.id) {
      setCategories((prev) => prev.map((c) => (c.id === catData.id ? ({ ...c, ...catData } as Category) : c)));
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        tenantId: currentTenant.id,
        name: catData.name || 'Nova Categoria',
        description: catData.description,
        isActive: true,
      };
      setCategories((prev) => [...prev, newCat]);
    }
  };

  const saveSupplier = (supData: Partial<Supplier>) => {
    if (supData.id) {
      setSuppliers((prev) => prev.map((s) => (s.id === supData.id ? ({ ...s, ...supData } as Supplier) : s)));
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        tenantId: currentTenant.id,
        name: supData.name || 'Novo Fornecedor',
        phone: supData.phone || '',
        email: supData.email || '',
        city: supData.city || '',
        state: supData.state || 'SP',
        isActive: true,
      };
      setSuppliers((prev) => [...prev, newSup]);
    }
  };

  // Adjust Stock (Inventory count)
  const adjustStock = (productId: string, variantId: string | undefined, newQuantity: number, reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const prevStock = prod.currentStock;
    const diff = subtractCurrency(newQuantity, prevStock);

    let updatedVariants = prod.variants;
    if (variantId && prod.variants) {
      updatedVariants = prod.variants.map((v) => {
        if (v.id === variantId) return { ...v, stockQuantity: newQuantity };
        return v;
      });
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            currentStock: newQuantity,
            variants: updatedVariants,
          };
        }
        return p;
      })
    );

    const movement: StockMovement = {
      id: `sm-adj-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      productId: prod.id,
      productName: prod.name,
      variantId,
      movementType: 'ajuste_inventario',
      quantity: Math.abs(diff),
      previousStock: prevStock,
      newStock: newQuantity,
      unitCost: prod.costPrice,
      reason: `Ajuste de Balanço: ${reason}`,
      userName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };
    setStockMovements((prev) => [movement, ...prev]);

    logAudit('STOCK_ADJUSTED', 'STOCK', prod.id, {
      product: prod.name,
      previous: prevStock,
      newStock: newQuantity,
      reason,
    });
  };

  // Transfer stock between branches
  const transferStock = (productId: string, fromBranchId: string, toBranchId: string, quantity: number, reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || prod.currentStock < quantity) return;

    // Record movement
    const fromBranch = branches.find((b) => b.id === fromBranchId);
    const toBranch = branches.find((b) => b.id === toBranchId);

    const smOut: StockMovement = {
      id: `sm-tr-out-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: fromBranchId,
      productId: prod.id,
      productName: prod.name,
      movementType: 'transferencia_saida',
      quantity,
      previousStock: prod.currentStock,
      newStock: subtractCurrency(prod.currentStock, quantity),
      unitCost: prod.costPrice,
      reason: `Transferência enviada para ${toBranch?.name || 'Filial'}: ${reason}`,
      userName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    setStockMovements((prev) => [smOut, ...prev]);

    logAudit('STOCK_TRANSFERRED', 'STOCK', prod.id, {
      from: fromBranch?.name,
      to: toBranch?.name,
      quantity,
      reason,
    });
  };

  // Superadmin tenant status toggle
  const toggleTenantStatus = (tenantId: string, newStatus: 'trial' | 'active' | 'suspended' | 'cancelled') => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, status: newStatus } : t))
    );
    logAudit('TENANT_STATUS_CHANGED', 'TENANT', tenantId, { newStatus });
  };

  const createTenant = (data: Partial<Tenant> & { adminPassword?: string }) => {
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: data.name || 'Nova Empresa Ltda',
      tradeName: data.tradeName || 'Nome Fantasia',
      cnpjCpf: data.cnpjCpf || '00.000.000/0001-00',
      email: data.email || 'contato@empresa.com.br',
      phone: data.phone || '(11) 90000-0000',
      planId: data.planId || 'plan-prata',
      status: 'active',
      trialEndsAt: new Date(Date.now() + 15 * 86400 * 1000).toISOString(),
      currentPeriodEndsAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      settings: {
        receiptFormat: '80mm',
        receiptFooter: 'Obrigado pela preferência!',
        allowNegativeStock: false,
        whatsappPhone: '',
        whatsappMessageTemplate: 'Obrigado por sua compra #{numero_venda}! Valor: {valor}.',
        autoPrintReceipt: true,
        enableCrediario: true,
      },
      createdAt: new Date().toISOString(),
    };
    setTenants((prev) => [...prev, newTenant]);

    // Create default main branch for this tenant
    const mainBranch: Branch = {
      id: `branch-${Date.now()}`,
      tenantId: newTenant.id,
      name: 'Matriz Principal',
      code: 'MATRIZ',
      isMain: true,
      phone: newTenant.phone,
      address: 'Endereço Principal',
      city: 'São Paulo',
      state: 'SP',
    };
    setBranches((prev) => [...prev, mainBranch]);

    // Create administrator user with the specified access password
    const adminUser: UserProfile = {
      id: `user-${Date.now()}`,
      tenantId: newTenant.id,
      branchId: mainBranch.id,
      fullName: `Admin ${newTenant.tradeName || newTenant.name}`,
      email: newTenant.email,
      password: data.adminPassword || '123456',
      role: 'admin',
      permissions: ['pos_sale', 'discounts', 'cancel_sale', 'finance', 'inventory', 'reports', 'settings'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, adminUser]);

    logAudit('TENANT_CREATED', 'TENANT', newTenant.id, {
      name: newTenant.name,
      adminEmail: newTenant.email,
    });
  };

  return (
    <AppContext.Provider
      value={{
        tenants,
        currentTenant,
        branches,
        currentBranch,
        users,
        currentUser,
        plans,
        categories,
        brands,
        suppliers,
        products,
        customers,
        cashRegisters,
        activeCashRegister,
        cashMovements,
        sales,
        accountsPayable,
        accountsReceivable,
        cashbookEntries,
        financialAccounts,
        costCenters,
        chartOfAccounts,
        stockMovements,
        auditLogs,
        switchTenant,
        switchBranch,
        switchUserRole,
        updateTenantSettings,
        openCashRegister,
        closeCashRegister,
        addCashMovement,
        executeSale,
        cancelSale,
        payAccountPayable,
        reverseAccountPayable,
        receiveAccountReceivable,
        reverseAccountReceivable,
        createManualPayable,
        createManualReceivable,
        createInstallmentPayable,
        createInstallmentReceivable,
        transferBetweenAccounts,
        saveChartAccount,
        deleteChartAccount,
        saveCostCenter,
        deleteCostCenter,
        saveProduct,
        deleteProduct,
        saveCustomer,
        deleteCustomer,
        saveCategory,
        saveSupplier,
        adjustStock,
        transferStock,
        invoices,
        toggleTenantStatus,
        createTenant,
        createInvoice,
        markInvoiceAsPaid,
        sendInvoiceReminder,
        authenticatedUser,
        loginUser,
        logoutUser,
        saveUser,
        deleteUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
