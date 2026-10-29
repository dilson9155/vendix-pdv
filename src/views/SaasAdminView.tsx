import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tenant, SaaSPlan, TenantBillingInvoice } from '../types';
import { formatBRL } from '../utils/currency';
import {
  Building2,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  TrendingUp,
  CreditCard,
  Shield,
  Search,
  X,
  FileText,
  Send,
  QrCode,
  Copy,
  Calendar,
  Check,
  Clock,
  DollarSign,
  AlertCircle,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Key,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SaasAdminView: React.FC = () => {
  const {
    tenants,
    plans,
    invoices,
    toggleTenantStatus,
    createTenant,
    switchTenant,
    createInvoice,
    markInvoiceAsPaid,
    sendInvoiceReminder,
    users,
    saveUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stores' | 'billing' | 'plans'>('stores');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billingStatusFilter, setBillingStatusFilter] = useState<string>('all');

  // Modals state
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForPix, setSelectedInvoiceForPix] = useState<TenantBillingInvoice | null>(null);
  const [passwordModalTenant, setPasswordModalTenant] = useState<Tenant | null>(null);
  const [tenantNewPassword, setTenantNewPassword] = useState('');
  const [showTenantNewPassword, setShowTenantNewPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Tenant form
  const [newTenantName, setNewTenantName] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlanId, setNewPlanId] = useState(plans[1]?.id || plans[0]?.id || 'plan-prata');
  const [newAdminPassword, setNewAdminPassword] = useState('123456');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // New Invoice form
  const [invTenantId, setInvTenantId] = useState(tenants[0]?.id || '');
  const [invPlanName, setInvPlanName] = useState('Plano Prata');
  const [invAmount, setInvAmount] = useState('199.90');
  const [invCycle, setInvCycle] = useState<'mensal' | 'anual'>('mensal');
  const [invDueDate, setInvDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [invPaymentMethod, setInvPaymentMethod] = useState<'pix' | 'boleto' | 'cartao'>('pix');
  const [invNotes, setInvNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // MRR & KPI calculations
  const activeTenants = tenants.filter((t) => t.status === 'active');
  const trialTenants = tenants.filter((t) => t.status === 'trial');
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended');

  const mrrTotal = activeTenants.reduce((acc, t) => {
    const plan = plans.find((p) => p.id === t.planId);
    return acc + (plan?.price || 0);
  }, 0);

  // Invoices calculations
  const totalPaidInvoices = invoices
    .filter((inv) => inv.status === 'pago')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const totalPendingInvoices = invoices
    .filter((inv) => inv.status === 'pendente')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const totalOverdueInvoices = invoices
    .filter((inv) => inv.status === 'vencido')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cnpjCpf.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = billingStatusFilter === 'all' || inv.status === billingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newCnpj) {
      showToast('Preencha os campos obrigatórios da empresa.');
      return;
    }

    createTenant({
      name: newTenantName,
      tradeName: newTradeName || newTenantName,
      cnpjCpf: newCnpj,
      email: newEmail,
      phone: newPhone,
      planId: newPlanId,
      adminPassword: newAdminPassword.trim() || '123456',
    });

    setIsTenantModalOpen(false);
    setNewTenantName('');
    setNewTradeName('');
    setNewCnpj('');
    setNewEmail('');
    setNewPhone('');
    setNewAdminPassword('123456');
    showToast(`Empresa ${newTradeName || newTenantName} cadastrada com sucesso! Senha de acesso definida.`);
  };

  const handleSaveTenantPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalTenant) return;
    if (!tenantNewPassword || tenantNewPassword.length < 3) {
      showToast('A senha de acesso deve ter pelo menos 3 caracteres.');
      return;
    }

    const adminUser =
      users.find((u) => u.tenantId === passwordModalTenant.id && (u.role === 'admin' || u.role === 'superadmin')) ||
      users.find((u) => u.tenantId === passwordModalTenant.id);

    if (adminUser) {
      saveUser({
        ...adminUser,
        password: tenantNewPassword,
      });
      showToast(`Senha de acesso de ${passwordModalTenant.tradeName || passwordModalTenant.name} atualizada com sucesso!`);
    } else {
      saveUser({
        fullName: `Admin ${passwordModalTenant.tradeName || passwordModalTenant.name}`,
        email: passwordModalTenant.email,
        password: tenantNewPassword,
        role: 'admin',
        tenantId: passwordModalTenant.id,
        isActive: true,
        permissions: ['pos_sale', 'discounts', 'cancel_sale', 'finance', 'inventory', 'reports', 'settings'],
      });
      showToast(`Usuário admin e senha criados com sucesso!`);
    }

    setPasswordModalTenant(null);
    setTenantNewPassword('');
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const tenant = tenants.find((t) => t.id === invTenantId);
    if (!tenant) return;

    const amountNum = parseFloat(invAmount.replace(',', '.')) || 0;
    if (amountNum <= 0) {
      showToast('O valor da fatura deve ser maior que zero.');
      return;
    }

    createInvoice({
      tenantId: tenant.id,
      tenantName: tenant.tradeName || tenant.name,
      amount: amountNum,
      planName: invPlanName,
      billingCycle: invCycle,
      dueDate: invDueDate,
      paymentMethod: invPaymentMethod,
      notes: invNotes,
    });

    setIsInvoiceModalOpen(false);
    setInvNotes('');
    showToast(`Fatura gerada com sucesso para ${tenant.tradeName || tenant.name}!`);
  };

  const handleMarkPaid = (invoiceId: string) => {
    markInvoiceAsPaid(invoiceId);
    showToast('Fatura marcada como PAGA com sucesso!');
    if (selectedInvoiceForPix?.id === invoiceId) {
      setSelectedInvoiceForPix(null);
    }
  };

  const handleSendReminder = (inv: TenantBillingInvoice) => {
    const res = sendInvoiceReminder(inv.id);
    showToast(`Lembrete disparado para ${inv.tenantName}! (E-mail e WhatsApp)`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado para a área de transferência!`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl bg-slate-900 border border-purple-500/60 text-white text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>Painel Super Admin SaaS</span>
            </h1>
            <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Multi-Tenant VENDIX
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão centralizada de lojas franqueadas/assinantes, faturamento recorrente, assinaturas e cobranças.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
          >
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>Emitir Nova Cobrança</span>
          </button>

          <button
            onClick={() => setIsTenantModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Loja</span>
          </button>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">MRR da Plataforma</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-['Montserrat']">
            {formatBRL(mrrTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Receita mensal recorrente</span>
            <span className="text-emerald-400 font-bold">{activeTenants.length} assinantes</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Recebimentos do Mês</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-['Montserrat']">
            {formatBRL(totalPaidInvoices)}
          </p>
          <p className="text-[11px] text-emerald-400 mt-2">Faturas quitadas com sucesso</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cobranças Pendentes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2 font-['Montserrat']">
            {formatBRL(totalPendingInvoices)}
          </p>
          <p className="text-[11px] text-amber-400/80 mt-2">Aguardando liquidação / Pix</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Inadimplência / Atrasos</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2 font-['Montserrat']">
            {formatBRL(totalOverdueInvoices)}
          </p>
          <p className="text-[11px] text-rose-400/80 mt-2">
            {suspendedTenants.length} lojas bloqueadas
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none sm:flex-wrap">
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'stores' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Lojas & Assinaturas ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'billing' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Assinaturas & Cobranças ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'plans' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Planos SaaS ({plans.length})</span>
        </button>
      </div>

      {/* Tab: Stores / Tenants */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por nome fantasia, razão ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativas (Adimplentes)</option>
                <option value="trial">Em Período de Teste</option>
                <option value="suspended">Suspensas (Bloqueadas)</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/40 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Loja / Razão Social</th>
                    <th className="px-4 py-3">CNPJ</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Plano Atual</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Vencimento Ciclo</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTenants.map((t) => {
                    const plan = plans.find((p) => p.id === t.planId);
                    const isActive = t.status === 'active';
                    const isTrial = t.status === 'trial';
                    const isSuspended = t.status === 'suspended';

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white text-xs">{t.tradeName || t.name}</p>
                          <p className="text-[10px] text-slate-400">{t.name}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{t.cnpjCpf}</td>
                        <td className="px-4 py-3 text-slate-300">
                          <p className="truncate max-w-[150px]">{t.email}</p>
                          <p className="text-[10px] text-slate-400">{t.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-purple-300">{plan?.name || 'Personalizado'}</span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatBRL(plan?.price || 0)}/mês
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isTrial
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {isTrial
                            ? `Trial até: ${new Date(t.trialEndsAt).toLocaleDateString('pt-BR')}`
                            : new Date(t.currentPeriodEndsAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage Password */}
                            <button
                              onClick={() => {
                                setPasswordModalTenant(t);
                                const adminUser =
                                  users.find(
                                    (u) =>
                                      u.tenantId === t.id && (u.role === 'admin' || u.role === 'superadmin')
                                  ) || users.find((u) => u.tenantId === t.id);
                                setTenantNewPassword(adminUser?.password || '');
                                setShowTenantNewPassword(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-colors border border-amber-500/30 flex items-center gap-1"
                              title="Ver ou redefinir senha de acesso do administrador desta empresa"
                            >
                              <Key className="w-3 h-3 text-amber-400" />
                              <span>Senha</span>
                            </button>

                            <button
                              onClick={() => {
                                switchTenant(t.id);
                                showToast(`Acessando ambiente da loja: ${t.tradeName || t.name}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white font-semibold text-xs transition-colors border border-purple-500/30 flex items-center gap-1"
                              title="Entrar no ambiente desta loja"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Acessar</span>
                            </button>

                            <button
                              onClick={() => {
                                const newSt = isActive ? 'suspended' : 'active';
                                toggleTenantStatus(t.id, newSt);
                                showToast(
                                  newSt === 'suspended'
                                    ? `Loja ${t.tradeName} suspensa.`
                                    : `Loja ${t.tradeName} reativada!`
                                );
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                                isActive
                                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                              }`}
                            >
                              {isActive ? 'Suspender' : 'Reativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Billing & Invoices */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {/* Invoices Filters */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar fatura por número ou loja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={billingStatusFilter}
                onChange={(e) => setBillingStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Todas as Faturas</option>
                <option value="pago">Pagas</option>
                <option value="pendente">Pendentes</option>
                <option value="vencido">Vencidas</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/40 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Fatura #</th>
                    <th className="px-4 py-3">Loja / Empresa</th>
                    <th className="px-4 py-3">Plano & Ciclo</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações de Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 'pago';
                    const isPending = inv.status === 'pendente';
                    const isOverdue = inv.status === 'vencido';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-purple-300 font-bold">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{inv.tenantName}</p>
                          {inv.notes && <p className="text-[10px] text-slate-400 truncate max-w-xs">{inv.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <p className="font-medium">{inv.planName}</p>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {inv.billingCycle}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white text-sm">
                          {formatBRL(inv.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300 border border-slate-700">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isOverdue
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pix details */}
                            <button
                              onClick={() => setSelectedInvoiceForPix(inv)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition-colors"
                              title="Ver QR Code Pix e Dados de Pagamento"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Send Reminder */}
                            {!isPaid && (
                              <button
                                onClick={() => handleSendReminder(inv)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-indigo-300 hover:text-indigo-200 transition-colors"
                                title="Enviar Notificação / Lembrete por WhatsApp e E-mail"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mark as Paid manual baixa */}
                            {!isPaid ? (
                              <button
                                onClick={() => handleMarkPaid(inv.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                              >
                                Dar Baixa
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                                Liquidada
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-['Montserrat']">
              Planos de Assinatura & Precificação
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Recursos disponíveis por plano, limites operacionais e modelo de monetização recorrente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((p) => {
                const isPopular = p.slug === 'prata';

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                      isPopular
                        ? 'bg-gradient-to-b from-purple-950/40 to-slate-900 border-purple-500/60 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/30'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div>
                      {isPopular && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider mb-2">
                          Mais Escolhido
                        </span>
                      )}
                      <h4 className="text-lg font-black text-white font-['Montserrat']">{p.name}</h4>
                      <p className="text-2xl font-black text-emerald-400 mt-2 font-['Montserrat']">
                        {formatBRL(p.price)}
                        <span className="text-xs font-normal text-slate-400">/mês</span>
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Usuários:</span>
                          <strong className="text-white">Até {p.maxUsers}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Filiais:</span>
                          <strong className="text-white">Até {p.maxBranches}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Produtos:</span>
                          <strong className="text-white">Até {p.maxProducts}</strong>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Recursos Inclusos:
                        </span>
                        {p.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <span className="text-[11px] text-slate-400 block text-center">
                        {tenants.filter((t) => t.planId === p.id).length} loja(s) neste plano
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Tenant */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-['Montserrat']">
                Cadastrar Nova Loja / Empresa (Tenant)
              </h3>
              <button onClick={() => setIsTenantModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Razão Social *</label>
                <input
                  type="text"
                  placeholder="Ex: Confecções Estilo & Elegância Ltda"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Glamour"
                  value={newTradeName}
                  onChange={(e) => setNewTradeName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ *</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={newCnpj}
                    onChange={(e) => setNewCnpj(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 98888-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail do Administrador *</label>
                <input
                  type="email"
                  placeholder="admin@empresa.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Senha de Acesso do Administrador *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const genPass = Math.random().toString(36).slice(-6) + '!';
                      setNewAdminPassword(genPass);
                      setShowAdminPassword(true);
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline font-medium"
                  >
                    Gerar Senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="Defina a senha de acesso da empresa (ex: 123456)"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showAdminPassword ? 'Ocultar Senha' : 'Ver Senha'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  O administrador usará este e-mail e senha para fazer login no sistema VENDIX.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Plano Escolhido</label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatBRL(p.price)}/mês (Até {p.maxUsers} usuários, {p.maxBranches} filial)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/40"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Invoice / Cobrança */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-['Montserrat']">
                Emitir Nova Fatura / Cobrança
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Loja / Tenant *</label>
                <select
                  value={invTenantId}
                  onChange={(e) => setInvTenantId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tradeName || t.name} ({t.cnpjCpf})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Descrição / Plano</label>
                  <input
                    type="text"
                    value={invPlanName}
                    onChange={(e) => setInvPlanName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ciclo</label>
                  <select
                    value={invCycle}
                    onChange={(e) => setInvCycle(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="199.90"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Forma Preferencial de Cobrança</label>
                <select
                  value={invPaymentMethod}
                  onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="pix">Pix (Chave Instantânea / QR Code)</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao">Cartão de Crédito Recorrente</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações da Fatura</label>
                <input
                  type="text"
                  placeholder="Ex: Mensalidade referente ao mês corrente com desconto promocional"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Gerar Cobrança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invoice Pix Details & Manual Baixa */}
      {selectedInvoiceForPix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base font-['Montserrat']">
                  Cobrança #{selectedInvoiceForPix.invoiceNumber}
                </h3>
                <p className="text-[11px] text-slate-400">{selectedInvoiceForPix.tenantName}</p>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPix(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Valor a Liquidar:</span>
                <span className="text-xl font-black text-white font-mono">
                  {formatBRL(selectedInvoiceForPix.amount)}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  selectedInvoiceForPix.status === 'pago'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {selectedInvoiceForPix.status}
              </span>
            </div>

            {/* Pix simulated QR Code */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                QR Code Pix de Cobrança VENDIX
              </span>
              <div className="w-36 h-36 bg-white mx-auto rounded-xl p-2 flex items-center justify-center shadow-lg">
                <QrCode className="w-32 h-32 text-slate-900" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Chave Pix CNPJ: 00.000.000/0001-00 (VENDIX SaaS Tecnologia)
              </p>
            </div>

            {/* Copia e Cola */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Código Pix Copia e Cola:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedInvoiceForPix.pixCode ||
                    `00020126580014BR.GOV.BCB.PIX0136${selectedInvoiceForPix.id}5204000053039865802BR5913VENDIX6009SAOPAULO62070503***6304`
                  }
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[10px] truncate"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      selectedInvoiceForPix.pixCode ||
                        `00020126580014BR.GOV.BCB.PIX0136${selectedInvoiceForPix.id}5204000053039865802BR5913VENDIX6009SAOPAULO62070503***6304`,
                      'Código Pix'
                    )
                  }
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              {selectedInvoiceForPix.status !== 'pago' ? (
                <button
                  onClick={() => handleMarkPaid(selectedInvoiceForPix.id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40"
                >
                  Registrar Pagamento Manual (Dar Baixa)
                </button>
              ) : (
                <button
                  onClick={() => setSelectedInvoiceForPix(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Senha de Acesso da Loja */}
      {passwordModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm font-['Montserrat']">
                  Senha de Acesso: {passwordModalTenant.tradeName || passwordModalTenant.name}
                </h3>
              </div>
              <button
                onClick={() => setPasswordModalTenant(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenantPassword} className="space-y-3.5">
              <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                <p>
                  <strong className="text-white">Empresa:</strong> {passwordModalTenant.name}
                </p>
                <p>
                  <strong className="text-white">CNPJ:</strong> {passwordModalTenant.cnpjCpf}
                </p>
                <p>
                  <strong className="text-white">E-mail de Login:</strong> {passwordModalTenant.email}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">Nova Senha de Acesso *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = Math.random().toString(36).slice(-6) + '!';
                      setTenantNewPassword(gen);
                      setShowTenantNewPassword(true);
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline font-medium"
                  >
                    Gerar Nova Senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTenantNewPassword ? 'text' : 'password'}
                    value={tenantNewPassword}
                    onChange={(e) => setTenantNewPassword(e.target.value)}
                    placeholder="Digite a nova senha de acesso"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-white font-mono text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTenantNewPassword(!showTenantNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showTenantNewPassword ? 'Ocultar Senha' : 'Ver Senha'}
                  >
                    {showTenantNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Essa nova senha entrará em vigor imediatamente para o login desta empresa.
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalTenant(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold shadow-lg"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
