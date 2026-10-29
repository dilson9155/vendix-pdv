import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { formatBRL } from '../utils/currency';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  CreditCard,
  Edit2,
  Trash2,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  X,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer, sales, accountsReceivable } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpjCpf.includes(searchTerm) ||
      c.phone.includes(searchTerm)
  );

  const handleOpenCreate = () => {
    setEditingCustomer({
      name: '',
      cnpjCpf: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      creditLimit: 500,
      creditUsed: 0,
      status: 'ativo',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name) return;
    saveCustomer(editingCustomer);
    setIsModalOpen(false);
  };

  const handleOpenWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = encodeURIComponent(`Olá ${name}, tudo bem? Entramos em contato da loja.`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Gestão de Clientes & Crediário</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro completo, limite de crédito próprio (Crediário), compras realizadas e contato via WhatsApp.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const availableCredit = Math.max(0, cust.creditLimit - cust.creditUsed);
          const customerReceivables = accountsReceivable.filter(
            (r) => r.customerId === cust.id && (r.status === 'aberto' || r.status === 'vencido')
          );
          const hasOverdue = customerReceivables.some((r) => r.status === 'vencido');

          return (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md hover:border-purple-500/30 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{cust.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">CPF: {cust.cnpjCpf || 'Não informado'}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      hasOverdue
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : cust.status === 'ativo'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {hasOverdue ? 'Inadimplente' : cust.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    <span>{cust.phone || cust.whatsapp || 'Sem telefone'}</span>
                  </p>
                  {cust.address && (
                    <p className="text-[11px] text-slate-400 truncate">{cust.address}</p>
                  )}
                </div>

                {/* Crediário Box */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Limite Total:</span>
                    <span className="font-bold text-white">{formatBRL(cust.creditLimit)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Crédito Utilizado:</span>
                    <span className="font-bold text-rose-400">{formatBRL(cust.creditUsed)}</span>
                  </div>
                  <div className="flex justify-between text-slate-200 font-bold pt-1 border-t border-slate-700">
                    <span>Disponível no Crediário:</span>
                    <span className="text-emerald-400">{formatBRL(availableCredit)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800 mt-4">
                <div className="flex items-center gap-1">
                  {cust.whatsapp && (
                    <button
                      onClick={() => handleOpenWhatsApp(cust.whatsapp, cust.name)}
                      className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCustomer(cust.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-semibold">
                  Total Gasto: {formatBRL(cust.totalSpent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Modal */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">
                {editingCustomer.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={editingCustomer.cnpjCpf || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, cnpjCpf: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Celular</label>
                  <input
                    type="text"
                    placeholder="(11) 90000-0000"
                    value={editingCustomer.whatsapp || editingCustomer.phone || ''}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        whatsapp: e.target.value,
                        phone: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Limite Autorizado de Crediário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingCustomer.creditLimit || 0}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      creditLimit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
