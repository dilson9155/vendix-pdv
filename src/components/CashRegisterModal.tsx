import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Unlock,
} from 'lucide-react';

interface CashRegisterModalProps {
  onClose: () => void;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({ onClose }) => {
  const {
    activeCashRegister,
    currentTenant,
    currentBranch,
    currentUser,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
    cashMovements,
    sales,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'open' | 'close' | 'suprimento' | 'sangria'>(
    activeCashRegister ? 'status' : 'open'
  );

  // Form states
  const [initialFloat, setInitialFloat] = useState<string>('200.00');
  const [terminalName, setTerminalName] = useState<string>('PDV-01 Balcão');
  const [countedAmount, setCountedAmount] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closeResult, setCloseResult] = useState<{ expected: number; difference: number } | null>(null);

  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Calculate live numbers for open register
  const registerSales = activeCashRegister
    ? sales.filter((s) => s.cashRegisterId === activeCashRegister.id && s.status === 'concluida')
    : [];

  const cashSalesTotal = registerSales.reduce((acc, sale) => {
    const cashPayments = sale.payments.filter((p) => p.paymentMethod === 'dinheiro');
    return acc + cashPayments.reduce((pAcc, p) => pAcc + p.amount, 0);
  }, 0);

  const suppliesTotal = activeCashRegister
    ? cashMovements
        .filter((m) => m.cashRegisterId === activeCashRegister.id && m.movementType === 'suprimento')
        .reduce((acc, m) => acc + m.amount, 0)
    : 0;

  const sangriasTotal = activeCashRegister
    ? cashMovements
        .filter((m) => m.cashRegisterId === activeCashRegister.id && m.movementType === 'sangria')
        .reduce((acc, m) => acc + m.amount, 0)
    : 0;

  const currentExpectedCash = activeCashRegister
    ? activeCashRegister.initialFloat + cashSalesTotal + suppliesTotal - sangriasTotal
    : 0;

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const floatNum = parseFloat(initialFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      setErrorMsg('Informe um valor de troco inicial válido.');
      return;
    }
    const success = openCashRegister(floatNum, terminalName);
    if (success) {
      setSuccessMsg('Caixa aberto com sucesso!');
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('status');
      }, 1000);
    } else {
      setErrorMsg('Já existe um caixa aberto para esta filial.');
    }
  };

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      setErrorMsg('Informe o valor físico contado no caixa.');
      return;
    }
    const result = closeCashRegister(counted, closeNotes);
    setCloseResult(result);
    setSuccessMsg('Caixa fechado com sucesso.');
  };

  const handleMovement = (type: 'suprimento' | 'sangria') => {
    setErrorMsg('');
    const amt = parseFloat(movementAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Informe um valor válido.');
      return;
    }
    if (!movementReason.trim()) {
      setErrorMsg('Informe a justificativa/motivo obrigatório.');
      return;
    }
    if (type === 'sangria' && amt > currentExpectedCash) {
      setErrorMsg(`Sangria maior que o saldo em dinheiro disponível (${formatBRL(currentExpectedCash)}).`);
      return;
    }

    addCashMovement(type, amt, movementReason.trim());
    setMovementAmount('');
    setMovementReason('');
    setSuccessMsg(`${type === 'suprimento' ? 'Suprimento' : 'Sangria'} realizado(a) com sucesso!`);
    setTimeout(() => {
      setSuccessMsg('');
      setActiveTab('status');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Controle de Frente de Caixa</h3>
              <p className="text-[11px] text-slate-400">{currentBranch.name} • Operador: {currentUser.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs overflow-x-auto scrollbar-none shrink-0">
          {activeCashRegister && (
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'status' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Status Atual
            </button>
          )}

          {!activeCashRegister && (
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'open' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Abrir Caixa
            </button>
          )}

          {activeCashRegister && (
            <>
              <button
                onClick={() => setActiveTab('suprimento')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'suprimento' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                + Suprimento
              </button>
              <button
                onClick={() => setActiveTab('sangria')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'sangria' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                - Sangria (Retirada)
              </button>
              <button
                onClick={() => setActiveTab('close')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'close' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Fechamento
              </button>
            </>
          )}
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab contents */}
        <div className="p-6">
          {/* Status Tab */}
          {activeTab === 'status' && activeCashRegister && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Fundo Inicial</span>
                  <p className="text-base font-bold text-white mt-1">{formatBRL(activeCashRegister.initialFloat)}</p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Vendas em Dinheiro</span>
                  <p className="text-base font-bold text-emerald-400 mt-1">{formatBRL(cashSalesTotal)}</p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Suprimentos (+)</span>
                  <p className="text-base font-bold text-indigo-400 mt-1">{formatBRL(suppliesTotal)}</p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Sangrias (-)</span>
                  <p className="text-base font-bold text-rose-400 mt-1">{formatBRL(sangriasTotal)}</p>
                </div>
              </div>

              {/* Total Expected in Drawer */}
              <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-purple-300 font-semibold uppercase">Saldo Atual Esperado em Dinheiro</span>
                  <p className="text-2xl font-black text-white mt-0.5">{formatBRL(currentExpectedCash)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Aberto às: {new Date(activeCashRegister.openedAt).toLocaleTimeString('pt-BR')}</p>
                </div>
                <Lock className="w-8 h-8 text-purple-400 opacity-60" />
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('suprimento')}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Novo Suprimento</span>
                </button>
                <button
                  onClick={() => setActiveTab('sangria')}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Nova Sangria</span>
                </button>
                <button
                  onClick={() => setActiveTab('close')}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Fechar Caixa</span>
                </button>
              </div>
            </div>
          )}

          {/* Open Register Tab */}
          {activeTab === 'open' && (
            <form onSubmit={handleOpenRegister} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-xl text-purple-200 text-xs">
                <Unlock className="w-5 h-5 text-purple-400 shrink-0" />
                <span>Informe o fundo de troco inicial para habilitar as operações de venda no terminal.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Terminal</label>
                <input
                  type="text"
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fundo de Troco Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialFloat}
                  onChange={(e) => setInitialFloat(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all"
              >
                Confirmar e Abrir Caixa
              </button>
            </form>
          )}

          {/* Suprimento / Sangria Tabs */}
          {(activeTab === 'suprimento' || activeTab === 'sangria') && (
            <div className="space-y-4">
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  activeTab === 'suprimento'
                    ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border border-amber-500/30 text-amber-300'
                }`}
              >
                {activeTab === 'suprimento' ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <span>
                  {activeTab === 'suprimento'
                    ? 'Suprimento: Adição de dinheiro ao caixa para reforço de troco.'
                    : 'Sangria: Retirada de dinheiro do caixa para envio ao cofre ou depósito bancário.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Justificativa / Motivo</label>
                <input
                  type="text"
                  placeholder={
                    activeTab === 'suprimento'
                      ? 'Ex: Reforço de moedas e cédulas de R$ 5 e R$ 10'
                      : 'Ex: Recolhimento de excesso para o cofre da Matriz'
                  }
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleMovement(activeTab)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all ${
                    activeTab === 'suprimento'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                  }`}
                >
                  Confirmar {activeTab === 'suprimento' ? 'Suprimento' : 'Sangria'}
                </button>
              </div>
            </div>
          )}

          {/* Close Register Tab */}
          {activeTab === 'close' && (
            <div className="space-y-4">
              {!closeResult ? (
                <form onSubmit={handleCloseRegister} className="space-y-4">
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                    <p className="font-semibold">Conferência Cega de Fechamento:</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Conte todas as notas e moedas físicas na gaveta e digite o valor real encontrado abaixo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Valor Total Contado na Gaveta (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={countedAmount}
                      onChange={(e) => setCountedAmount(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base font-bold focus:outline-none focus:border-rose-500"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Observações de Fechamento (Opcional)
                    </label>
                    <textarea
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      rows={2}
                      placeholder="Ex: Turno encerrado normalmente sem intercorrências..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('status')}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all"
                    >
                      Finalizar e Fechar Caixa
                    </button>
                  </div>
                </form>
              ) : (
                /* Report after closing */
                <div className="space-y-4">
                  <div className="text-center py-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <h4 className="font-bold text-white text-base">Relatório de Fechamento de Caixa</h4>
                    <p className="text-xs text-slate-400">Terminal {terminalName} encerrado.</p>
                  </div>

                  <div className="bg-slate-800/80 p-4 rounded-xl space-y-2 text-xs border border-slate-700">
                    <div className="flex justify-between text-slate-300">
                      <span>Saldo Esperado pelo Sistema:</span>
                      <span className="font-bold text-white">{formatBRL(closeResult.expected)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Valor Físico Contado:</span>
                      <span className="font-bold text-white">{formatBRL(parseFloat(countedAmount))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-sm">
                      <span>Diferença (Sobra / Falta):</span>
                      <span
                        className={
                          closeResult.difference === 0
                            ? 'text-emerald-400'
                            : closeResult.difference > 0
                            ? 'text-indigo-400'
                            : 'text-rose-400'
                        }
                      >
                        {closeResult.difference > 0 ? '+' : ''}
                        {formatBRL(closeResult.difference)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all"
                  >
                    Concluir e Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
