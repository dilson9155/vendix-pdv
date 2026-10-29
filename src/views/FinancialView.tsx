import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AccountPayable,
  AccountReceivable,
  CashbookEntry,
  FinancialAccount,
  ChartOfAccount,
  CostCenter,
} from '../types';
import { formatBRL, fromCents, toCents, addCurrency, subtractCurrency } from '../utils/currency';
import {
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Wallet,
  Plus,
  Landmark,
  Building,
  TrendingUp,
  Receipt,
  Download,
  X,
  CreditCard,
  Layers,
  FolderTree,
  Filter,
  Printer,
  ChevronRight,
  Split,
  Search,
} from 'lucide-react';

export const FinancialView: React.FC = () => {
  const {
    accountsPayable,
    accountsReceivable,
    cashbookEntries,
    financialAccounts,
    chartOfAccounts,
    costCenters,
    sales,
    suppliers,
    customers,
    payAccountPayable,
    reverseAccountPayable,
    receiveAccountReceivable,
    reverseAccountReceivable,
    createInstallmentPayable,
    createInstallmentReceivable,
    transferBetweenAccounts,
    saveChartAccount,
    deleteChartAccount,
    saveCostCenter,
    deleteCostCenter,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'payable' | 'receivable' | 'cashbook' | 'reports' | 'dre' | 'chart' | 'cost_centers' | 'accounts'
  >('payable');

  // Filters for Contas a Pagar
  const [payStatusFilter, setPayStatusFilter] = useState<string>('all');
  const [payCostCenterFilter, setPayCostCenterFilter] = useState<string>('all');
  const [paySearchTerm, setPaySearchTerm] = useState<string>('');
  const [payStartDate, setPayStartDate] = useState<string>('');
  const [payEndDate, setPayEndDate] = useState<string>('');

  // Filters for Contas a Receber
  const [recStatusFilter, setRecStatusFilter] = useState<string>('all');
  const [recCostCenterFilter, setRecCostCenterFilter] = useState<string>('all');
  const [recSearchTerm, setRecSearchTerm] = useState<string>('');
  const [recStartDate, setRecStartDate] = useState<string>('');
  const [recEndDate, setRecEndDate] = useState<string>('');

  // Filters for Livro Caixa
  const [cbAccountFilter, setCbAccountFilter] = useState<string>('all');
  const [cbTypeFilter, setCbTypeFilter] = useState<string>('all');
  const [cbStartDate, setCbStartDate] = useState<string>('');
  const [cbEndDate, setCbEndDate] = useState<string>('');

  // Modal: Baixa de Conta a Pagar
  const [payingPayable, setPayingPayable] = useState<AccountPayable | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payInterest, setPayInterest] = useState<string>('0');
  const [payPenalty, setPayPenalty] = useState<string>('0');
  const [payDiscount, setPayDiscount] = useState<string>('0');
  const [payAccountId, setPayAccountId] = useState<string>(financialAccounts[0]?.id || '');

  // Modal: Baixa de Conta a Receber
  const [receivingReceivable, setReceivingReceivable] = useState<AccountReceivable | null>(null);
  const [recAmount, setRecAmount] = useState<string>('');
  const [recInterest, setRecInterest] = useState<string>('0');
  const [recDiscount, setRecDiscount] = useState<string>('0');
  const [recAccountId, setRecAccountId] = useState<string>(financialAccounts[0]?.id || '');

  // Modal: Novo Lançamento com Parcelamento
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [billType, setBillType] = useState<'payable' | 'receivable'>('payable');
  const [billDesc, setBillDesc] = useState('');
  const [billDoc, setBillDoc] = useState('');
  const [billTotalAmount, setBillTotalAmount] = useState('');
  const [billInstallments, setBillInstallments] = useState(1);
  const [billIntervalDays, setBillIntervalDays] = useState(30);
  const [billDueDate, setBillDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billCompetenceDate, setBillCompetenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [billEntityName, setBillEntityName] = useState('');
  const [billChartAccountId, setBillChartAccountId] = useState(chartOfAccounts[0]?.id || '');
  const [billCostCenterId, setBillCostCenterId] = useState(costCenters[0]?.id || '');
  const [billFinancialAccountId, setBillFinancialAccountId] = useState(financialAccounts[0]?.id || '');
  const [billNotes, setBillNotes] = useState('');

  // Modal: Plano de Contas
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartCode, setChartCode] = useState('');
  const [chartDesc, setChartDesc] = useState('');
  const [chartNature, setChartNature] = useState<'receita' | 'despesa' | 'custo'>('despesa');
  const [chartType, setChartType] = useState<'sintetica' | 'analitica'>('analitica');
  const [chartParentCode, setChartParentCode] = useState('');

  // Modal: Centro de Custo
  const [isCostCenterModalOpen, setIsCostCenterModalOpen] = useState(false);
  const [ccCode, setCcCode] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccDesc, setCcDesc] = useState('');

  // Modal: Transferência Interna
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(financialAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(financialAccounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('Transferência de custódia entre contas');

  // Modal: Estorno de Baixa
  const [reversingItem, setReversingItem] = useState<{ type: 'payable' | 'receivable'; id: string; desc: string } | null>(null);
  const [reverseReason, setReverseReason] = useState('Estorno autorizado pelo gestor financeiro');

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  const filteredPayables = accountsPayable.filter((p) => {
    const matchesStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
    const matchesCC = payCostCenterFilter === 'all' || p.costCenterId === payCostCenterFilter;
    const matchesSearch =
      p.description.toLowerCase().includes(paySearchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(paySearchTerm.toLowerCase()) ||
      (p.documentNumber && p.documentNumber.includes(paySearchTerm));
    const matchesStart = !payStartDate || p.dueDate >= payStartDate;
    const matchesEnd = !payEndDate || p.dueDate <= payEndDate;
    return matchesStatus && matchesCC && matchesSearch && matchesStart && matchesEnd;
  });

  const filteredReceivables = accountsReceivable.filter((r) => {
    const matchesStatus = recStatusFilter === 'all' || r.status === recStatusFilter;
    const matchesCC = recCostCenterFilter === 'all' || r.costCenterId === recCostCenterFilter;
    const matchesSearch =
      r.description.toLowerCase().includes(recSearchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(recSearchTerm.toLowerCase()) ||
      (r.documentNumber && r.documentNumber.includes(recSearchTerm));
    const matchesStart = !recStartDate || r.dueDate >= recStartDate;
    const matchesEnd = !recEndDate || r.dueDate <= recEndDate;
    return matchesStatus && matchesCC && matchesSearch && matchesStart && matchesEnd;
  });

  const filteredCashbook = cashbookEntries.filter((cb) => {
    const matchesAccount = cbAccountFilter === 'all' || cb.financialAccountId === cbAccountFilter;
    const matchesType = cbTypeFilter === 'all' || cb.entryType === cbTypeFilter;
    const matchesStart = !cbStartDate || cb.entryDate >= cbStartDate;
    const matchesEnd = !cbEndDate || cb.entryDate <= cbEndDate;
    return matchesAccount && matchesType && matchesStart && matchesEnd;
  });

  // Totals for Payables
  const totalPayableAmount = filteredPayables.reduce((a, b) => a + b.amount, 0);
  const totalPayablePaid = filteredPayables.reduce((a, b) => a + b.paidAmount, 0);
  const totalPayablePending = totalPayableAmount - totalPayablePaid;

  // Totals for Receivables
  const totalReceivableAmount = filteredReceivables.reduce((a, b) => a + b.amount, 0);
  const totalReceivableReceived = filteredReceivables.reduce((a, b) => a + b.receivedAmount, 0);
  const totalReceivablePending = totalReceivableAmount - totalReceivableReceived;
  const overdueReceivablesAmount = filteredReceivables
    .filter((r) => r.status === 'vencido')
    .reduce((a, b) => a + (b.amount - b.receivedAmount), 0);

  // -------------------------------------------------------------
  // DRE Gerencial Calculations
  // -------------------------------------------------------------
  const completedSales = sales.filter((s) => s.status === 'concluida');
  const grossRevenue = completedSales.reduce((acc, s) => acc + s.subtotal, 0);
  const discountsGiven = completedSales.reduce((acc, s) => acc + s.discount, 0);
  const netRevenue = grossRevenue - discountsGiven;
  const cmv = completedSales.reduce((acc, s) => acc + (s.costTotal || 0), 0);
  const grossMargin = netRevenue - cmv;
  const grossMarginPercent = netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0;

  const paidExpenses = accountsPayable
    .filter((p) => p.status === 'pago' || p.status === 'parcial')
    .reduce((acc, p) => acc + p.paidAmount, 0);

  const operatingResult = grossMargin - paidExpenses;
  const netResult = operatingResult;

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayable) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    payAccountPayable(
      payingPayable.id,
      amt,
      payAccountId,
      parseFloat(payInterest) || 0,
      parseFloat(payPenalty) || 0,
      parseFloat(payDiscount) || 0
    );
    setPayingPayable(null);
  };

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingReceivable) return;
    const amt = parseFloat(recAmount);
    if (isNaN(amt) || amt <= 0) return;

    receiveAccountReceivable(
      receivingReceivable.id,
      amt,
      recAccountId,
      parseFloat(recInterest) || 0,
      parseFloat(recDiscount) || 0
    );
    setReceivingReceivable(null);
  };

  const handleConfirmNewBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(billTotalAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (billType === 'payable') {
      createInstallmentPayable(
        {
          description: billDesc,
          documentNumber: billDoc,
          amount: amt,
          dueDate: billDueDate,
          competenceDate: billCompetenceDate,
          supplierName: billEntityName || 'Fornecedor Diversos',
          chartAccountId: billChartAccountId,
          costCenterId: billCostCenterId,
          financialAccountId: billFinancialAccountId,
          notes: billNotes,
        },
        billInstallments,
        billIntervalDays
      );
    } else {
      createInstallmentReceivable(
        {
          description: billDesc,
          documentNumber: billDoc,
          amount: amt,
          dueDate: billDueDate,
          customerName: billEntityName || 'Cliente Diversos',
          chartAccountId: billChartAccountId,
          costCenterId: billCostCenterId,
          financialAccountId: billFinancialAccountId,
        },
        billInstallments,
        billIntervalDays
      );
    }

    setIsNewBillModalOpen(false);
    setBillDesc('');
    setBillDoc('');
    setBillTotalAmount('');
    setBillInstallments(1);
    setBillEntityName('');
    setBillNotes('');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;

    transferBetweenAccounts(fromAccountId, toAccountId, amt, transferDesc);
    setIsTransferModalOpen(false);
    setTransferAmount('');
  };

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingItem) return;

    if (reversingItem.type === 'payable') {
      reverseAccountPayable(reversingItem.id, reverseReason);
    } else {
      reverseAccountReceivable(reversingItem.id, reverseReason);
    }
    setReversingItem(null);
  };

  const handleSaveChartAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartCode || !chartDesc) return;
    saveChartAccount({
      code: chartCode,
      description: chartDesc,
      nature: chartNature,
      accountType: chartType,
      parentCode: chartParentCode || undefined,
    });
    setIsChartModalOpen(false);
    setChartCode('');
    setChartDesc('');
    setChartParentCode('');
  };

  const handleSaveCostCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccCode || !ccName) return;
    saveCostCenter({
      code: ccCode,
      name: ccName,
      description: ccDesc,
    });
    setIsCostCenterModalOpen(false);
    setCcCode('');
    setCcName('');
    setCcDesc('');
  };

  // Export functions
  const exportCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-emerald-400" />
            <span>Gestão Financeira, DRE & Contabilidade</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle integrado de contas a pagar/receber com parcelamento e baixas, plano de contas, centro de custos e relatórios gerenciais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Transferência</span>
          </button>
          <button
            onClick={() => {
              setBillType('payable');
              setIsNewBillModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Título / Parcelamento</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs overflow-x-auto scrollbar-none sm:flex-wrap">
        {[
          { id: 'payable', label: 'Contas a Pagar', count: accountsPayable.filter((p) => p.status === 'aberto' || p.status === 'vencido').length },
          { id: 'receivable', label: 'Contas a Receber', count: accountsReceivable.filter((r) => r.status === 'aberto' || r.status === 'vencido').length },
          { id: 'cashbook', label: 'Relatório Livro Caixa', count: null },
          { id: 'reports', label: 'Relatórios Analíticos', count: null },
          { id: 'dre', label: 'DRE Gerencial', count: null },
          { id: 'chart', label: 'Plano de Contas', count: chartOfAccounts.length },
          { id: 'cost_centers', label: 'Centros de Custos', count: costCenters.length },
          { id: 'accounts', label: 'Contas Financeiras', count: financialAccounts.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40 font-extrabold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded-full text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. CONTAS A PAGAR */}
      {activeTab === 'payable' && (
        <div className="space-y-4">
          {/* Payables Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total a Pagar (Filtrado)</span>
              <p className="text-xl font-black text-white mt-0.5 font-['Montserrat']">{formatBRL(totalPayableAmount)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Baixado / Pago</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5 font-['Montserrat']">{formatBRL(totalPayablePaid)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Saldo em Aberto</span>
              <p className="text-xl font-black text-rose-400 mt-0.5 font-['Montserrat']">{formatBRL(totalPayablePending)}</p>
            </div>
          </div>

          {/* Payables Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar fornecedor, doc..."
                value={paySearchTerm}
                onChange={(e) => setPaySearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white"
              />
            </div>
            <div>
              <select
                value={payStatusFilter}
                onChange={(e) => setPayStatusFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Todas as Situações</option>
                <option value="aberto">Em Aberto</option>
                <option value="pago">Quitadas / Pagas</option>
                <option value="vencido">Vencidas</option>
                <option value="parcial">Parcialmente Pagas</option>
              </select>
            </div>
            <div>
              <select
                value={payCostCenterFilter}
                onChange={(e) => setPayCostCenterFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Todos os Centros de Custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="date"
                title="Vencimento inicial"
                value={payStartDate}
                onChange={(e) => setPayStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                title="Vencimento final"
                value={payEndDate}
                onChange={(e) => setPayEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
              <button
                onClick={() =>
                  exportCSV(
                    'contas_a_pagar',
                    ['Fornecedor', 'Descricao', 'Documento', 'Parcela', 'Vencimento', 'Valor', 'Pago', 'Situacao'],
                    filteredPayables.map((p) => [
                      p.supplierName,
                      p.description,
                      p.documentNumber || '',
                      `${p.installmentNumber || 1}/${p.totalInstallments || 1}`,
                      p.dueDate,
                      p.amount.toFixed(2),
                      p.paidAmount.toFixed(2),
                      p.status,
                    ])
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold"
                title="Exportar CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Payables Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Fornecedor / Descrição</th>
                    <th className="px-4 py-3">Doc</th>
                    <th className="px-4 py-3">Parcela</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor Total</th>
                    <th className="px-4 py-3">Valor Pago</th>
                    <th className="px-4 py-3 text-center">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPayables.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma conta a pagar encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPayables.map((p) => {
                      const isOverdue = p.status === 'vencido';
                      const isPaid = p.status === 'pago';

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">
                            <p className="font-bold">{p.supplierName}</p>
                            <p className="text-[11px] text-slate-400">{p.description}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">{p.documentNumber || '-'}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">
                            {p.installmentNumber ? `${p.installmentNumber}/${p.totalInstallments || 1}` : 'Única'}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {p.dueDate}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-white">{formatBRL(p.amount)}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400">{formatBRL(p.paidAmount)}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                isPaid
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : isOverdue
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setPayingPayable(p);
                                  setPayAmount((p.amount - p.paidAmount).toFixed(2));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                              >
                                Baixar
                              </button>
                            )}
                            {p.paidAmount > 0 && (
                              <button
                                onClick={() =>
                                  setReversingItem({
                                    type: 'payable',
                                    id: p.id,
                                    desc: `${p.description} (${p.supplierName})`,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                                title="Estornar Baixa"
                              >
                                Estorno
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTAS A RECEBER */}
      {activeTab === 'receivable' && (
        <div className="space-y-4">
          {/* Receivables Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total a Receber</span>
              <p className="text-xl font-black text-white mt-0.5 font-['Montserrat']">{formatBRL(totalReceivableAmount)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Recebido</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5 font-['Montserrat']">{formatBRL(totalReceivableReceived)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">A Receber em Aberto</span>
              <p className="text-xl font-black text-indigo-400 mt-0.5 font-['Montserrat']">{formatBRL(totalReceivablePending)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Inadimplência (Vencidas)</span>
              <p className="text-xl font-black text-rose-400 mt-0.5 font-['Montserrat']">{formatBRL(overdueReceivablesAmount)}</p>
            </div>
          </div>

          {/* Receivables Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente, contrato..."
                value={recSearchTerm}
                onChange={(e) => setRecSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white"
              />
            </div>
            <div>
              <select
                value={recStatusFilter}
                onChange={(e) => setRecStatusFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Todas as Situações</option>
                <option value="aberto">Em Aberto</option>
                <option value="recebido">Recebidas</option>
                <option value="vencido">Vencidas (Inadimplência)</option>
                <option value="parcial">Parcialmente Recebidas</option>
              </select>
            </div>
            <div>
              <select
                value={recCostCenterFilter}
                onChange={(e) => setRecCostCenterFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Todos os Centros de Custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="date"
                title="Vencimento inicial"
                value={recStartDate}
                onChange={(e) => setRecStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                title="Vencimento final"
                value={recEndDate}
                onChange={(e) => setRecEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
              <button
                onClick={() =>
                  exportCSV(
                    'contas_a_receber',
                    ['Cliente', 'Descricao', 'Parcela', 'Vencimento', 'Valor', 'Recebido', 'Situacao'],
                    filteredReceivables.map((r) => [
                      r.customerName,
                      r.description,
                      `${r.installmentNumber}/${r.totalInstallments}`,
                      r.dueDate,
                      r.amount.toFixed(2),
                      r.receivedAmount.toFixed(2),
                      r.status,
                    ])
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold"
                title="Exportar CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Cliente / Descrição</th>
                    <th className="px-4 py-3">Parcela</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor Total</th>
                    <th className="px-4 py-3">Valor Recebido</th>
                    <th className="px-4 py-3 text-center">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhum recebível encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map((r) => {
                      const isOverdue = r.status === 'vencido';
                      const isReceived = r.status === 'recebido';

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">
                            <p className="font-bold">{r.customerName}</p>
                            <p className="text-[11px] text-slate-400">{r.description}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300">
                            {r.installmentNumber} / {r.totalInstallments}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {r.dueDate}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-white">{formatBRL(r.amount)}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400">{formatBRL(r.receivedAmount)}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                isReceived
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : isOverdue
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            {!isReceived && (
                              <button
                                onClick={() => {
                                  setReceivingReceivable(r);
                                  setRecAmount((r.amount - r.receivedAmount).toFixed(2));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                              >
                                Baixar
                              </button>
                            )}
                            {r.receivedAmount > 0 && (
                              <button
                                onClick={() =>
                                  setReversingItem({
                                    type: 'receivable',
                                    id: r.id,
                                    desc: `${r.description} (${r.customerName})`,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                                title="Estornar Recebimento"
                              >
                                Estorno
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. RELATÓRIO LIVRO CAIXA COM FILTROS */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Conta Bancária / Caixa</label>
              <select
                value={cbAccountFilter}
                onChange={(e) => setCbAccountFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Todas as Contas</option>
                {financialAccounts.map((fa) => (
                  <option key={fa.id} value={fa.id}>
                    {fa.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo de Lançamento</label>
              <select
                value={cbTypeFilter}
                onChange={(e) => setCbTypeFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200"
              >
                <option value="all">Entradas & Saídas</option>
                <option value="entrada">Apenas Entradas (+)</option>
                <option value="saida">Apenas Saídas (-)</option>
                <option value="transferencia_interna">Transferências Internas (⇄)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">De (Data Inicial)</label>
              <input
                type="date"
                value={cbStartDate}
                onChange={(e) => setCbStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Até (Data Final)</label>
                <input
                  type="date"
                  value={cbEndDate}
                  onChange={(e) => setCbEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <button
                onClick={() =>
                  exportCSV(
                    'livro_caixa',
                    ['Data', 'Conta', 'Tipo', 'Descricao', 'Operador', 'Valor'],
                    filteredCashbook.map((cb) => [
                      new Date(cb.createdAt).toLocaleString('pt-BR'),
                      cb.financialAccountName,
                      cb.entryType,
                      cb.description,
                      cb.userName,
                      cb.amount.toFixed(2),
                    ])
                  )
                }
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                title="Exportar Livro Caixa CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cashbook Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Conta Financeira</th>
                    <th className="px-4 py-3">Descrição da Operação</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3 text-right">Valor Movimentado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredCashbook.map((e) => {
                    const isEntry = e.entryType === 'entrada';
                    const isTransfer = e.entryType === 'transferencia_interna';

                    return (
                      <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                          {new Date(e.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{e.financialAccountName}</td>
                        <td className="px-4 py-3 text-slate-200">{e.description}</td>
                        <td className="px-4 py-3 text-slate-400">{e.userName}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span
                            className={
                              isTransfer
                                ? 'text-blue-400'
                                : isEntry
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {isTransfer ? '⇄ ' : isEntry ? '+ ' : '- '}
                            {formatBRL(e.amount)}
                          </span>
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

      {/* 4. RELATÓRIOS ANALÍTICOS */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Relatório Contas a Pagar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-mono">
                  {accountsPayable.length} títulos
                </span>
              </div>
              <h3 className="font-bold text-white text-base">Relatório Analítico de Contas a Pagar</h3>
              <p className="text-xs text-slate-400 mt-1">
                Visão consolidada de todas as obrigações com fornecedores, contas contábeis, despesas operacionais e custos com mercadorias.
              </p>

              <div className="mt-4 p-3 bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total em Aberto:</span>
                  <span className="font-bold text-rose-400">
                    {formatBRL(accountsPayable.filter((p) => p.status === 'aberto' || p.status === 'vencido').reduce((a, b) => a + (b.amount - b.paidAmount), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Quitado:</span>
                  <span className="font-bold text-emerald-400">
                    {formatBRL(accountsPayable.reduce((a, b) => a + b.paidAmount, 0))}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                exportCSV(
                  'relatorio_contas_a_pagar_completo',
                  ['Fornecedor', 'Descricao', 'Documento', 'Vencimento', 'Valor', 'Pago', 'Status'],
                  accountsPayable.map((p) => [
                    p.supplierName,
                    p.description,
                    p.documentNumber || '',
                    p.dueDate,
                    p.amount.toFixed(2),
                    p.paidAmount.toFixed(2),
                    p.status,
                  ])
                )
              }
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Exportar Relatório em CSV</span>
            </button>
          </div>

          {/* Relatório Contas a Receber */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-mono">
                  {accountsReceivable.length} recebíveis
                </span>
              </div>
              <h3 className="font-bold text-white text-base">Relatório Analítico de Contas a Receber</h3>
              <p className="text-xs text-slate-400 mt-1">
                Estatísticas de recebíveis de vendas no PDV, contratos de crediário próprio, taxas de inadimplência e projeção de entradas.
              </p>

              <div className="mt-4 p-3 bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Recebíveis a Vencer:</span>
                  <span className="font-bold text-indigo-400">
                    {formatBRL(accountsReceivable.filter((r) => r.status === 'aberto').reduce((a, b) => a + (b.amount - b.receivedAmount), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Inadimplência Vencida:</span>
                  <span className="font-bold text-rose-400">
                    {formatBRL(accountsReceivable.filter((r) => r.status === 'vencido').reduce((a, b) => a + (b.amount - b.receivedAmount), 0))}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                exportCSV(
                  'relatorio_contas_a_receber_completo',
                  ['Cliente', 'Descricao', 'Documento', 'Vencimento', 'Valor', 'Recebido', 'Status'],
                  accountsReceivable.map((r) => [
                    r.customerName,
                    r.description,
                    r.documentNumber || '',
                    r.dueDate,
                    r.amount.toFixed(2),
                    r.receivedAmount.toFixed(2),
                    r.status,
                  ])
                )
              }
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Exportar Relatório em CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. DRE GERENCIAL COM EXPORTAÇÃO */}
      {activeTab === 'dre' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white font-['Montserrat']">
                Demonstrativo do Resultado do Exercício (DRE Gerencial)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Regras contábeis gerenciais por competência sobre vendas líquidas e custos históricos.
              </p>
            </div>
            <button
              onClick={() =>
                exportCSV(
                  'dre_gerencial',
                  ['Rubrica', 'Valor', 'Percentual'],
                  [
                    ['(+) Receita Bruta de Vendas', grossRevenue.toFixed(2), '100%'],
                    ['(-) Deducoes e Descontos Concedidos', discountsGiven.toFixed(2), `${((discountsGiven / (grossRevenue || 1)) * 100).toFixed(1)}%`],
                    ['(=) Receita Operacional Liquida', netRevenue.toFixed(2), `${((netRevenue / (grossRevenue || 1)) * 100).toFixed(1)}%`],
                    ['(-) Custo das Mercadorias Vendidas (CMV)', cmv.toFixed(2), `${((cmv / (netRevenue || 1)) * 100).toFixed(1)}%`],
                    ['(=) Lucro Bruto (Margem de Contribuicao)', grossMargin.toFixed(2), `${grossMarginPercent.toFixed(1)}%`],
                    ['(-) Despesas Operacionais e Administrativas', paidExpenses.toFixed(2), `${((paidExpenses / (netRevenue || 1)) * 100).toFixed(1)}%`],
                    ['(=) Resultado Liquido do Periodo', netResult.toFixed(2), `${((netResult / (netRevenue || 1)) * 100).toFixed(1)}%`],
                  ]
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar DRE CSV</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Receita Bruta */}
            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-800/40">
              <span className="font-bold text-white">(+) RECEITA BRUTA DE VENDAS</span>
              <span className="font-bold text-white font-mono">{formatBRL(grossRevenue)}</span>
            </div>

            {/* Deduções */}
            <div className="flex justify-between items-center py-1.5 px-3 text-slate-400 pl-6">
              <span>(-) Descontos Comerciais Concedidos no PDV</span>
              <span className="font-mono text-rose-400">- {formatBRL(discountsGiven)}</span>
            </div>

            {/* Receita Líquida */}
            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-purple-950/30 border border-purple-500/30 font-bold">
              <span className="text-purple-300">(=) RECEITA OPERACIONAL LÍQUIDA</span>
              <span className="font-mono text-purple-200 text-sm">{formatBRL(netRevenue)}</span>
            </div>

            {/* CMV */}
            <div className="flex justify-between items-center py-2 px-3 text-slate-300 pl-6">
              <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
              <span className="font-mono text-rose-400 font-semibold">- {formatBRL(cmv)}</span>
            </div>

            {/* Lucro Bruto */}
            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 font-bold">
              <span className="text-emerald-300">(=) LUCRO BRUTO (Margem de Contribuição)</span>
              <div className="text-right">
                <span className="font-mono text-emerald-300 text-sm">{formatBRL(grossMargin)}</span>
                <span className="text-[10px] text-emerald-400 block font-normal">
                  Margem: {grossMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Despesas Operacionais */}
            <div className="flex justify-between items-center py-2 px-3 text-slate-300 pl-6">
              <span>(-) Despesas Operacionais e Administrativas Pagas</span>
              <span className="font-mono text-rose-400 font-semibold">- {formatBRL(paidExpenses)}</span>
            </div>

            {/* Resultado Líquido Gerencial */}
            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-400/40 font-black text-sm">
              <span className="text-white">(=) RESULTADO LÍQUIDO DO PERÍODO</span>
              <span className={`font-mono text-base ${netResult >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                {formatBRL(netResult)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. PLANO DE CONTAS CONTÁBEIS */}
      {activeTab === 'chart' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-purple-400" />
                <span>Plano de Contas Gerencial & Contábil</span>
              </h3>
              <p className="text-xs text-slate-400">Estrutura em árvore para classificação de despesas e receitas.</p>
            </div>
            <button
              onClick={() => setIsChartModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Conta Contábil</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {chartOfAccounts.map((coa) => {
              const isSynthetic = coa.accountType === 'sintetica';
              return (
                <div
                  key={coa.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isSynthetic
                      ? 'bg-slate-800/80 border-slate-700 font-bold text-white'
                      : 'bg-slate-800/30 border-slate-800 pl-8 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-purple-400 font-bold">{coa.code}</span>
                    <span>{coa.description}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold uppercase ${
                        coa.nature === 'receita'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : coa.nature === 'custo'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {coa.nature}
                    </span>
                    <span className="text-slate-400 font-mono">({coa.accountType})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. CENTROS DE CUSTOS */}
      {activeTab === 'cost_centers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" />
                <span>Centros de Custos da Empresa</span>
              </h3>
              <p className="text-xs text-slate-400">Classificação setorial das receitas e despesas por unidade/departamento.</p>
            </div>
            <button
              onClick={() => setIsCostCenterModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Centro de Custo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {costCenters.map((cc) => (
              <div key={cc.id} className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-purple-400">{cc.code}</span>
                  <span className="text-emerald-400 font-semibold text-[10px]">Ativo</span>
                </div>
                <h4 className="font-bold text-white text-sm">{cc.name}</h4>
                {cc.description && <p className="text-slate-400 text-[11px]">{cc.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. CONTAS FINANCEIRAS */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialAccounts.map((fa) => (
            <div
              key={fa.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    {fa.accountType.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-white text-base">{fa.name}</h4>
                {fa.bankName && (
                  <p className="text-xs text-slate-400 mt-1">
                    {fa.bankName} | Ag: {fa.agency} | CC: {fa.accountNumber}
                  </p>
                )}
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <span className="text-xs text-slate-400 uppercase font-semibold">Saldo Atual Disponível</span>
                <p className="text-2xl font-black text-emerald-400 mt-0.5 font-['Montserrat']">
                  {formatBRL(fa.currentBalance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NOVO LANÇAMENTO COM OPÇÃO DE PARCELAMENTO */}
      {isNewBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm">
                Lançamento Financeiro & Parcelamento
              </h4>
              <button onClick={() => setIsNewBillModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBillType('payable')}
                className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                  billType === 'payable' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Conta a Pagar (Despesa)
              </button>
              <button
                type="button"
                onClick={() => setBillType('receivable')}
                className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                  billType === 'receivable' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Conta a Receber (Receita)
              </button>
            </div>

            <form onSubmit={handleConfirmNewBill} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aquisição de lote de tecidos e aviamentos"
                  value={billDesc}
                  onChange={(e) => setBillDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {billType === 'payable' ? 'Fornecedor' : 'Cliente'}
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da pessoa/empresa"
                    value={billEntityName}
                    onChange={(e) => setBillEntityName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nº Documento / Nota</label>
                  <input
                    type="text"
                    placeholder="Ex: NF-5849"
                    value={billDoc}
                    onChange={(e) => setBillDoc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Parcelamento controls */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
                <span className="font-bold text-purple-300 uppercase text-[10px] tracking-wider block">
                  Regras de Parcelamento
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={billTotalAmount}
                      onChange={(e) => setBillTotalAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Qtd Parcelas</label>
                    <select
                      value={billInstallments}
                      onChange={(e) => setBillInstallments(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                        <option key={n} value={n}>
                          {n}x {n > 1 && billTotalAmount ? `de ${formatBRL((parseFloat(billTotalAmount) || 0) / n)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Intervalo (Dias)</label>
                    <select
                      value={billIntervalDays}
                      onChange={(e) => setBillIntervalDays(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value={30}>30 em 30 dias (Mensal)</option>
                      <option value={15}>15 em 15 dias (Quinzenal)</option>
                      <option value={7}>7 em 7 dias (Semanal)</option>
                      <option value={60}>60 em 60 dias (Bimestral)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">1º Vencimento</label>
                  <input
                    type="date"
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Competência</label>
                  <input
                    type="date"
                    value={billCompetenceDate}
                    onChange={(e) => setBillCompetenceDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Conta Contábil Gerencial</label>
                  <select
                    value={billChartAccountId}
                    onChange={(e) => setBillChartAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {chartOfAccounts
                      .filter((c) => (billType === 'payable' ? c.nature !== 'receita' : c.nature === 'receita'))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.description}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Centro de Custo</label>
                  <select
                    value={billCostCenterId}
                    onChange={(e) => setBillCostCenterId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewBillModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Gerar {billInstallments > 1 ? `${billInstallments} Parcelas` : 'Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA DE CONTA A PAGAR */}
      {payingPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Baixa de Conta a Pagar</h4>
            <div className="bg-slate-800 p-3 rounded-xl text-slate-300 space-y-1">
              <p className="font-bold text-white">{payingPayable.description}</p>
              <p className="text-[11px] text-slate-400">Fornecedor: {payingPayable.supplierName}</p>
              <p className="text-[11px] text-slate-400">Saldo restante: {formatBRL(payingPayable.amount - payingPayable.paidAmount)}</p>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor do Pagamento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px]">Juros (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payInterest}
                    onChange={(e) => setPayInterest(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px]">Multa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payPenalty}
                    onChange={(e) => setPayPenalty(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px]">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payDiscount}
                    onChange={(e) => setPayDiscount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-emerald-400 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conta Financeira de Saída</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {financialAccounts.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name} (Saldo: {formatBRL(fa.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingPayable(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA DE CONTA A RECEBER */}
      {receivingReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Baixa de Conta a Receber</h4>
            <div className="bg-slate-800 p-3 rounded-xl text-slate-300 space-y-1">
              <p className="font-bold text-white">{receivingReceivable.customerName}</p>
              <p className="text-[11px] text-slate-400">{receivingReceivable.description}</p>
              <p className="text-[11px] text-slate-400">Saldo a receber: {formatBRL(receivingReceivable.amount - receivingReceivable.receivedAmount)}</p>
            </div>

            <form onSubmit={handleConfirmReceive} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px]">Juros/Acréscimos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={recInterest}
                    onChange={(e) => setRecInterest(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px]">Desconto Concedido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={recDiscount}
                    onChange={(e) => setRecDiscount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conta de Entrada / Crédito</label>
                <select
                  value={recAccountId}
                  onChange={(e) => setRecAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {financialAccounts.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name} (Saldo: {formatBRL(fa.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceivingReceivable(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO DE BAIXA */}
      {reversingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Confirmar Estorno Financeiro</h4>
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              <p className="font-bold">Aviso de Auditoria:</p>
              <p className="text-[11px] mt-0.5">
                O estorno reverterá os valores baixados de volta para o status em aberto e recomporá o saldo da conta financeira correspondente.
              </p>
            </div>

            <p className="text-slate-300">
              Título: <strong>{reversingItem.desc}</strong>
            </p>

            <form onSubmit={handleConfirmReversal} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificativa do Estorno</label>
                <textarea
                  rows={2}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversingItem(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirmar Estorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONTA CONTÁBIL */}
      {isChartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Nova Conta Contábil / Gerencial</h4>

            <form onSubmit={handleSaveChartAccount} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código Contábil</label>
                  <input
                    type="text"
                    placeholder="Ex: 4.5"
                    value={chartCode}
                    onChange={(e) => setChartCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Natureza</label>
                  <select
                    value={chartNature}
                    onChange={(e) => setChartNature(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                    <option value="custo">Custo (CMV)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição da Conta</label>
                <input
                  type="text"
                  placeholder="Ex: Despesas com Softwares e Licenças"
                  value={chartDesc}
                  onChange={(e) => setChartDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo da Conta</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="analitica">Analítica (Recebe lançamentos)</option>
                  <option value="sintetica">Sintética (Conta totalizadora de grupo)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChartModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CENTRO DE CUSTO */}
      {isCostCenterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Novo Centro de Custo</h4>

            <form onSubmit={handleSaveCostCenter} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Código</label>
                <input
                  type="text"
                  placeholder="Ex: 01.03"
                  value={ccCode}
                  onChange={(e) => setCcCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Centro de Custo</label>
                <input
                  type="text"
                  placeholder="Ex: Loja Online & Delivery"
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Operações digitais e logística"
                  value={ccDesc}
                  onChange={(e) => setCcDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCostCenterModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Salvar Centro de Custo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERÊNCIA INTERNA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Transferência Interna entre Contas</h4>
            <p className="text-[11px] text-slate-400">
              Não é classificada como receita ou despesa; apenas movimenta o saldo entre gaveta de caixa e bancos.
            </p>

            <form onSubmit={handleConfirmTransfer} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conta Origem (Saída)</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {financialAccounts.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name} ({formatBRL(fa.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conta Destino (Entrada)</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {financialAccounts.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name} ({formatBRL(fa.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor da Transferência (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
