import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Users,
  Package,
  Boxes,
  CircleDollarSign,
  Settings,
  ShieldCheck,
  Building,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export type MainView =
  | 'dashboard'
  | 'pdv'
  | 'sales'
  | 'customers'
  | 'products'
  | 'stock'
  | 'financial'
  | 'users'
  | 'settings'
  | 'saas_admin';

interface SidebarProps {
  currentView: MainView;
  onSelectView: (view: MainView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView }) => {
  const { currentUser, products, accountsPayable } = useApp();

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager' || isSuperAdmin;
  const isCashier = currentUser.role === 'cashier' || isAdminOrManager;

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const overduePayables = accountsPayable.filter((p) => p.status === 'vencido').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      visible: true,
      badge: null,
    },
    {
      id: 'pdv',
      label: 'PDV / Caixa',
      icon: ShoppingBag,
      visible: isCashier,
      highlight: true,
      badge: null,
    },
    {
      id: 'sales',
      label: 'Vendas & Histórico',
      icon: Receipt,
      visible: true,
      badge: null,
    },
    {
      id: 'customers',
      label: 'Clientes & Crediário',
      icon: Users,
      visible: true,
      badge: null,
    },
    {
      id: 'products',
      label: 'Produtos & Variantes',
      icon: Package,
      visible: true,
      badge: null,
    },
    {
      id: 'stock',
      label: 'Estoque & Movimentos',
      icon: Boxes,
      visible: isAdminOrManager || currentUser.role === 'stockist',
      badge: lowStockCount > 0 ? `${lowStockCount} baixos` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'financial',
      label: 'Financeiro & DRE',
      icon: CircleDollarSign,
      visible: isAdminOrManager,
      badge: overduePayables > 0 ? `${overduePayables} vencidos` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'users',
      label: 'Usuários & Perfis',
      icon: ShieldCheck,
      visible: isAdminOrManager,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      visible: isAdminOrManager,
      badge: null,
    },
    {
      id: 'saas_admin',
      label: 'Administração SaaS',
      icon: Building,
      visible: isSuperAdmin,
      badge: 'Super Admin',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Menu Principal
        </div>

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id as MainView)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                    : item.highlight
                    ? 'text-purple-300 hover:bg-purple-950/40 hover:text-white border border-purple-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.highlight ? 'text-purple-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-200" />}
                </div>
              </button>
            );
          })}
      </div>

      {/* Slogan & Mini Pro Footnote */}
      <div className="p-3 border-t border-slate-800 m-2 rounded-xl bg-slate-950/50">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">VENDIX Retail</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Moda, Cosméticos, Acessórios & Variedades.
        </p>
      </div>
    </aside>
  );
};
