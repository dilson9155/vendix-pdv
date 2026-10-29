import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar, MainView } from './components/Sidebar';
import { CashRegisterModal } from './components/CashRegisterModal';
import { LoginModal } from './components/LoginModal';

// Views
import { DashboardView } from './views/DashboardView';
import { PDVView } from './views/PDVView';
import { SalesHistoryView } from './views/SalesHistoryView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { StockView } from './views/StockView';
import { FinancialView } from './views/FinancialView';
import { UsersView } from './views/UsersView';
import { SettingsView } from './views/SettingsView';
import { SaasAdminView } from './views/SaasAdminView';

import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Package,
  Menu,
  X,
  Lock,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState<MainView>('dashboard');
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectView = (view: MainView) => {
    // Strict security guard: filiais / non-superadmin cannot access saas_admin
    if (view === 'saas_admin' && currentUser?.role !== 'superadmin') {
      setCurrentView('dashboard');
      return;
    }
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        onOpenPDV={() => setCurrentView('pdv')}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onNavigate={handleSelectView}
        currentView={currentView}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar currentView={currentView} onSelectView={handleSelectView} />
        </div>

        {/* Mobile Slide-over Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 border-r border-slate-800 z-50">
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <span className="font-bold text-white text-sm">Menu VENDIX</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar currentView={currentView} onSelectView={handleSelectView} />
            </div>
          </div>
        )}

        {/* Dynamic View Display */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 pb-16 md:pb-0">
          {currentView === 'dashboard' && <DashboardView onNavigate={handleSelectView} />}
          {currentView === 'pdv' && <PDVView />}
          {currentView === 'sales' && <SalesHistoryView />}
          {currentView === 'customers' && <CustomersView />}
          {currentView === 'products' && <ProductsView />}
          {currentView === 'stock' && <StockView />}
          {currentView === 'financial' && <FinancialView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'settings' && <SettingsView onNavigate={handleSelectView} />}
          {currentView === 'saas_admin' && (
            currentUser?.role === 'superadmin' ? (
              <SaasAdminView />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-white mb-2 font-['Montserrat']">
                  Acesso Restrito ao Super Administrador
                </h2>
                <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                  Filiais e usuários comuns não possuem autorização para acessar o Painel Super Admin ou gerenciar empresas e infraestrutura SaaS.
                </p>
                <button
                  onClick={() => setCurrentView('pdv')}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-purple-950/40"
                >
                  Ir para o PDV / Caixa
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 z-30">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'dashboard' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentView('pdv')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'pdv' ? 'text-purple-400' : 'text-purple-300'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white -mt-3 shadow-md shadow-purple-900/50">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span>PDV</span>
        </button>

        <button
          onClick={() => setCurrentView('sales')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'sales' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Vendas</span>
        </button>

        <button
          onClick={() => setCurrentView('products')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'products' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400"
        >
          <Menu className="w-4 h-4" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Cash Register Modal */}
      {isCashModalOpen && (
        <CashRegisterModal onClose={() => setIsCashModalOpen(false)} />
      )}

      {/* Login / Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
