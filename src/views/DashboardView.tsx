import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBRL, formatNumber } from '../utils/currency';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Package,
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    sales,
    products,
    accountsPayable,
    accountsReceivable,
    financialAccounts,
    currentTenant,
    currentBranch,
  } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('month');

  // Filter sales by date & branch
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const completedSales = sales.filter((s) => s.status === 'concluida');

  const todaySales = completedSales.filter(
    (s) => s.createdAt.startsWith(todayStr)
  );

  const monthSales = completedSales.filter(
    (s) => new Date(s.createdAt) >= startOfMonth
  );

  const activeSales =
    dateFilter === 'today'
      ? todaySales
      : dateFilter === '7days'
      ? completedSales.filter(
          (s) => new Date(s.createdAt).getTime() >= Date.now() - 7 * 86400 * 1000
        )
      : monthSales;

  // KPIs
  const totalRevenue = activeSales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = activeSales.length;
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const totalCost = activeSales.reduce((acc, s) => acc + (s.costTotal || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Alerts: low stock & payables overdue
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);
  const overduePayables = accountsPayable.filter((p) => p.status === 'vencido');
  const overdueReceivables = accountsReceivable.filter((r) => r.status === 'vencido');

  const totalBankBalance = financialAccounts.reduce((acc, fa) => acc + fa.currentBalance, 0);

  // Top Products sold
  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  completedSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, total: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].total += item.totalPrice;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Payment methods breakdown
  const paymentBreakdown: Record<string, number> = {};
  completedSales.forEach((sale) => {
    sale.payments.forEach((p) => {
      paymentBreakdown[p.paymentMethod] = (paymentBreakdown[p.paymentMethod] || 0) + p.amount;
    });
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white font-['Montserrat']">
              Painel Gerencial VENDIX
            </h1>
            <span className="bg-purple-600/30 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
              {currentBranch.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicadores consolidados em tempo real com regras contábeis e financeiras.
          </p>
        </div>

        {/* Date Filter selector */}
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700/80 text-xs font-semibold">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'today' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === '7days' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'month' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Este Mês
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Faturamento Líquido
              </p>
              <h3 className="text-2xl font-black text-white mt-1 font-['Montserrat']">
                {formatBRL(totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{salesCount} vendas realizadas</span>
              </p>
            </div>
            <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Lucro Bruto */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Lucro Bruto (Margem)
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1 font-['Montserrat']">
                {formatBRL(grossProfit)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Margem Bruta:{' '}
                <span className="text-emerald-300 font-bold">{grossMarginPercent.toFixed(1)}%</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ticket Médio
              </p>
              <h3 className="text-2xl font-black text-white mt-1 font-['Montserrat']">
                {formatBRL(averageTicket)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Média por atendimento PDV</p>
            </div>
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Saldo Financeiro em Contas */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saldo em Contas & Caixa
              </p>
              <h3 className="text-2xl font-black text-white mt-1 font-['Montserrat']">
                {formatBRL(totalBankBalance)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {financialAccounts.length} contas ativas
              </p>
            </div>
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Critical Operational Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Warning */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Produtos com Estoque Baixo ({lowStockProducts.length})
              </h4>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-purple-400 hover:text-purple-300 text-xs font-semibold"
            >
              Ver Estoque
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Nenhum produto abaixo do estoque mínimo.</p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {p.currentStock} / min {p.minStock} {p.unitMeasure}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Financial Obligations */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Contas a Pagar Vencidas ({overduePayables.length})
              </h4>
            </div>
            <button
              onClick={() => onNavigate('financial')}
              className="text-purple-400 hover:text-purple-300 text-xs font-semibold"
            >
              Ver Financeiro
            </button>
          </div>

          {overduePayables.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Nenhuma conta a pagar vencida no momento.</p>
          ) : (
            <div className="space-y-2">
              {overduePayables.slice(0, 3).map((pay) => (
                <div
                  key={pay.id}
                  className="bg-slate-800/80 p-2.5 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-white truncate">{pay.description}</p>
                    <p className="text-[10px] text-slate-400">{pay.supplierName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-rose-400">{formatBRL(pay.amount)}</p>
                    <p className="text-[9px] text-slate-400">Venceu em: {pay.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Top Selling Items & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 5 Products */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span>Produtos Mais Vendidos no Período</span>
            </h4>
            <span className="text-[11px] text-slate-400">Ordenado por volume</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[280px]">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-slate-400">{p.qty} un vendidas</span>
                    <span className="font-bold text-emerald-400">{formatBRL(p.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Formas de Pagamento</span>
            </h4>
          </div>

          <div className="space-y-3">
            {Object.entries(paymentBreakdown).map(([method, amount]) => {
              const totalSum = Object.values(paymentBreakdown).reduce((a, b) => a + b, 0);
              const percentage = totalSum > 0 ? (amount / totalSum) * 100 : 0;

              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-slate-300 font-semibold">{method.replace('_', ' ')}</span>
                    <span className="text-white font-bold">{formatBRL(amount)}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-slate-400">{percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
