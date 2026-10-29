import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Store,
  Building2,
  User,
  ShoppingBag,
  Bell,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
  LogIn,
  LogOut,
  Plus,
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  onOpenPDV: () => void;
  onOpenCashModal: () => void;
  onOpenLogin: () => void;
  onNavigate?: (view: any) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPDV,
  onOpenCashModal,
  onOpenLogin,
  onNavigate,
  currentView,
}) => {
  const {
    currentTenant,
    tenants,
    switchTenant,
    currentBranch,
    branches,
    switchBranch,
    currentUser,
    switchUserRole,
    activeCashRegister,
    products,
    accountsPayable,
    authenticatedUser,
    logoutUser,
  } = useApp();

  const tenantBranches = branches.filter((b) => b.tenantId === currentTenant.id);

  // Notifications: low stock + overdue bills
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const overduePayablesCount = accountsPayable.filter((p) => p.status === 'vencido').length;
  const totalNotifications = lowStockCount + overduePayablesCount;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <span className="text-white font-extrabold text-xl tracking-tighter">V</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-['Montserrat']">
                VENDIX
              </span>
              <span className="bg-purple-600/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block italic">
              "Vendeu, organizou, cresceu."
            </p>
          </div>
        </div>

        {/* Tenant & Branch Switchers */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-Tenant Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
            <Store className="w-4 h-4 text-purple-400 shrink-0" />
            <select
              value={currentTenant.id}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  onNavigate?.('saas_admin');
                } else {
                  switchTenant(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[175px] truncate"
              title="Alternar Empresa ou Cadastrar Nova"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.tradeName || t.name}
                </option>
              ))}
              <option value="__add_new__" className="bg-purple-950 text-purple-300 font-bold">
                ➕ + Cadastrar Nova Empresa...
              </option>
            </select>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('saas_admin')}
                title="Cadastrar / Gerenciar Empresas (Painel SaaS)"
                className="w-5 h-5 rounded flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-600/40 transition-colors ml-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Branch Switcher */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <select
              value={currentBranch.id}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[160px] truncate"
              title="Alternar Filial"
            >
              {tenantBranches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cash Register Status */}
          <button
            onClick={onOpenCashModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
              activeCashRegister
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20'
            }`}
            title="Clique para gerenciar Caixa (Abertura, Sangria, Suprimento, Fechamento)"
          >
            {activeCashRegister ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden md:inline">Caixa:</span>
                <span className="font-bold text-[11px] truncate max-w-[65px] sm:max-w-none">
                  {activeCashRegister.terminalName}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-[11px] hidden sm:inline">Caixa Fechado</span>
                <span className="text-[11px] sm:hidden">Fechado</span>
              </>
            )}
          </button>

          {/* Fast PDV Button */}
          {currentView !== 'pdv' && (
            <button
              onClick={onOpenPDV}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-md shadow-purple-900/50 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-200 shrink-0" />
              <span className="hidden sm:inline">Abrir PDV (F2)</span>
              <span className="sm:hidden text-[11px]">PDV</span>
            </button>
          )}

          {/* User Auth and Role Area */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-left transition-colors"
              title="Clique para entrar com e-mail/senha ou trocar usuário"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                {(currentUser?.fullName || 'U').charAt(0)}
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                  {currentUser?.fullName || 'Usuário'}
                </p>
                <div className="flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[9px] text-purple-300 uppercase tracking-wider font-semibold">
                    {currentUser?.role || 'admin'}
                  </span>
                </div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Quick role change for immediate dev testing */}
            <select
              value={currentUser?.role || 'admin'}
              onChange={(e) => switchUserRole(e.target.value as UserRole)}
              className="hidden lg:block bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
              title="Mudar Perfil para Teste de Permissões"
            >
              <option value="superadmin">Super Admin</option>
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="cashier">Caixa PDV</option>
              <option value="stockist">Estoquista</option>
              <option value="salesperson">Vendedor</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
