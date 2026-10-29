import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import {
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  AlertTriangle,
  Package,
  Layers,
  History,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const StockView: React.FC = () => {
  const {
    products,
    stockMovements,
    branches,
    currentBranch,
    adjustStock,
    transferStock,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'transfer'>('inventory');

  // Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<{ id: string; name: string; current: number; variantId?: string } | null>(null);
  const [newCount, setNewCount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Contagem periódica de inventário');

  // Transfer Modal
  const [transferProdId, setTransferProdId] = useState(products[0]?.id || '');
  const [transferToBranchId, setTransferToBranchId] = useState(branches[1]?.id || '');
  const [transferQty, setTransferQty] = useState('');
  const [transferMotive, setTransferMotive] = useState('Remessa para atendimento de demanda');

  // Inventory valuation
  const totalCostValuation = products.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0);
  const totalSaleValuation = products.reduce((acc, p) => acc + p.currentStock * p.salePrice, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = parseFloat(newCount);
    if (isNaN(qty) || qty < 0) return;

    adjustStock(adjustingProduct.id, adjustingProduct.variantId, qty, adjustReason);
    setAdjustingProduct(null);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) return;

    transferStock(transferProdId, currentBranch.id, transferToBranchId, qty, transferMotive);
    setTransferQty('');
    setActiveTab('movements');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-purple-400" />
            <span>Controle de Estoque & Inventário</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Valorização patrimonial, balanço de inventário físico, transferências entre filiais e rastreabilidade total.
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'inventory' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Inventário Atual
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'movements' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Histórico de Movimentações
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'transfer' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Transferência entre Lojas
          </button>
        </div>
      </div>

      {/* Inventory KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Valor do Estoque a Custo (CMV)</span>
          <p className="text-2xl font-black text-white mt-1 font-['Montserrat']">
            {formatBRL(totalCostValuation)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Capital imobilizado em mercadorias</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Potencial de Venda do Estoque</span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-['Montserrat']">
            {formatBRL(totalSaleValuation)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Valor projetado a preço de venda</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Alertas de Estoque Mínimo</span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-['Montserrat']">
            {lowStockCount} produtos
          </p>
          <p className="text-[11px] text-amber-500/80 mt-1">Abaixo do limite de segurança</p>
        </div>
      </div>

      {/* Tab: Inventory List */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Produto / SKU</th>
                  <th className="px-4 py-3">Segmento</th>
                  <th className="px-4 py-3">Custo Unitário</th>
                  <th className="px-4 py-3">Total a Custo</th>
                  <th className="px-4 py-3">Total a Venda</th>
                  <th className="px-4 py-3 text-center">Saldo em Estoque</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => {
                  const isLow = p.currentStock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">SKU: {p.sku}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-400">{p.segment}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{formatBRL(p.costPrice)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {formatBRL(p.currentStock * p.costPrice)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                        {formatBRL(p.currentStock * p.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                            isLow
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {p.currentStock} {p.unitMeasure}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setAdjustingProduct({ id: p.id, name: p.name, current: p.currentStock });
                            setNewCount(String(p.currentStock));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs border border-purple-500/20 transition-colors"
                        >
                          Balanço / Ajuste
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Movements Audit Trail */}
      {activeTab === 'movements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider">Histórico de Entradas, Saídas e Balanços</span>
            <span className="text-slate-400">{stockMovements.length} movimentações auditadas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/40 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo de Operação</th>
                  <th className="px-4 py-3">Qtd Movimentada</th>
                  <th className="px-4 py-3">Anterior → Novo</th>
                  <th className="px-4 py-3">Motivo / Justificativa</th>
                  <th className="px-4 py-3">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma movimentação avulsa registrada ainda.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((m) => {
                    const isOut = m.movementType.includes('saida') || m.movementType.includes('venda');

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                          {new Date(m.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{m.productName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isOut ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {m.movementType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          <span className={isOut ? 'text-rose-400' : 'text-emerald-400'}>
                            {isOut ? '-' : '+'}
                            {m.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {m.previousStock} → {m.newStock}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{m.reason}</td>
                        <td className="px-4 py-3 text-slate-400">{m.userName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Transfer Between Branches */}
      {activeTab === 'transfer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg mx-auto space-y-4">
          <h3 className="text-base font-bold text-white">Transferência de Estoque entre Unidades</h3>
          <p className="text-xs text-slate-400">
            Origem atual: <strong className="text-purple-300">{currentBranch.name}</strong>
          </p>

          <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Selecione o Produto</label>
              <select
                value={transferProdId}
                onChange={(e) => setTransferProdId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Disponível: {p.currentStock} {p.unitMeasure})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Filial de Destino</label>
              <select
                value={transferToBranchId}
                onChange={(e) => setTransferToBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                {branches
                  .filter((b) => b.id !== currentBranch.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Quantidade a Transferir</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Motivo da Transferência</label>
              <input
                type="text"
                value={transferMotive}
                onChange={(e) => setTransferMotive(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg"
            >
              Confirmar Transferência de Estoque
            </button>
          </form>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Ajuste / Balanço de Estoque</h4>
            <p className="text-slate-400">{adjustingProduct.name}</p>
            <p className="text-[11px] text-slate-500">Saldo atual no sistema: {adjustingProduct.current}</p>

            <form onSubmit={handleConfirmAdjust} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nova Quantidade Contada</label>
                <input
                  type="number"
                  min="0"
                  value={newCount}
                  onChange={(e) => setNewCount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificativa do Ajuste</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Salvar Balanço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
