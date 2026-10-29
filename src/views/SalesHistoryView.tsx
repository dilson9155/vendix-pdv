import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { formatBRL } from '../utils/currency';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Receipt,
  Search,
  Printer,
  Share2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  ShoppingBag,
} from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { sales, cancelSale, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // Cancellation modal
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('Desistência do cliente antes da retirada');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredSales = sales.filter(
    (s) =>
      s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.cashierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale) return;
    setErrorMsg('');

    const res = cancelSale(cancellingSale.id, cancelReason);
    if (res.success) {
      setCancellingSale(null);
    } else {
      setErrorMsg(res.error || 'Erro ao cancelar venda.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-400" />
            <span>Histórico de Vendas & Comprovantes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta de operações do PDV, reimpressão de comprovante térmico e cancelamento auditado.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por número da venda, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Venda</th>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSales.map((sale) => {
                const isCancelled = sale.status === 'cancelada';

                return (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white">#{sale.saleNumber}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {new Date(sale.createdAt).toLocaleDateString('pt-BR')}{' '}
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{sale.customerName}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {sale.items.reduce((a, b) => a + b.quantity, 0)} itens
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-300">
                      {sale.payments.map((p) => p.paymentMethod).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400 font-mono text-sm">
                      {formatBRL(sale.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          isCancelled
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setSelectedSaleForReceipt(sale)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs border border-purple-500/20 transition-colors inline-flex items-center gap-1"
                        title="Ver Comprovante"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cupom</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => setCancellingSale(sale)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                          title="Cancelar Venda"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs">
            <h4 className="font-bold text-white text-sm">Cancelar Venda #{cancellingSale.saleNumber}</h4>
            <p className="text-slate-400">
              Valor: <strong className="text-white">{formatBRL(cancellingSale.total)}</strong>
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              Aviso: O cancelamento devolverá os itens ao estoque e registrará estorno no Livro Caixa e contas a receber.
            </div>

            {errorMsg && <p className="text-rose-400 font-semibold">{errorMsg}</p>}

            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motivo do Cancelamento</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}
    </div>
  );
};
