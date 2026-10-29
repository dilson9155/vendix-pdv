import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Mail, User, Shield, AlertCircle, CheckCircle2, X, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginUser, saveUser, users, branches, currentTenant, authenticatedUser, logoutUser } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('edilson9155@gmail.com');
  const [password, setPassword] = useState('91550748');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'cashier' | 'stockist' | 'salesperson'>('admin');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = loginUser(email, password);
    if (res.success) {
      setSuccessMsg('Login efetuado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setErrorMsg(res.error || 'Credenciais inválidas.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName || !email || !password) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 3) {
      setErrorMsg('A senha deve ter pelo menos 3 caracteres.');
      return;
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setErrorMsg('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    saveUser({
      fullName,
      email,
      password,
      phone,
      role,
      branchId,
      tenantId: currentTenant.id,
      isActive: true,
      permissions: ['pos_sale', 'discounts'],
    });

    setSuccessMsg('Cadastro realizado com sucesso! Fazendo login...');
    setTimeout(() => {
      loginUser(email, password);
      onClose();
    }, 1000);
  };

  const fillQuickCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-900/60 to-slate-900 border-b border-slate-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 mx-auto flex items-center justify-center shadow-lg shadow-purple-900/50 mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-black text-white font-['Montserrat']">
            {mode === 'login' ? 'Acesso ao VENDIX SaaS' : 'Cadastro de Novo Usuário'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Informe seu e-mail e senha para acessar os módulos da empresa'
              : 'Cadastre suas credenciais para login seguro'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs">
          <button
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'login' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar com E-mail
          </button>
          <button
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'register' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cadastrar Novo Acesso
          </button>
        </div>

        {/* Alert Feedback */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="seu.email@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.01]"
              >
                Entrar no Sistema
              </button>

              {/* Quick Login Accounts Demo Shortcuts */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Contas de Acesso Rápido:
                </span>
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/40 mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                      👑 Super Admin Principal:
                    </span>
                    <p className="text-xs font-black text-white font-mono">edilson9155@gmail.com</p>
                    <p className="text-[10px] text-purple-200">Senha: <span className="font-mono font-bold">91550748</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('edilson9155@gmail.com', '91550748')}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm transition-transform active:scale-95"
                  >
                    Usar Esta
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('anaclara@bellachic.com.br', '123')}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                  >
                    <p className="font-bold text-purple-300 text-[11px]">Ana Clara (Admin)</p>
                    <p className="text-[9px] text-slate-400">Senha: 123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('juliana.caixa@bellachic.com.br', '123')}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                  >
                    <p className="font-bold text-emerald-300 text-[11px]">Juliana (Caixa PDV)</p>
                    <p className="text-[9px] text-slate-400">Senha: 123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('carlos.mendes@bellachic.com.br', '123')}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                  >
                    <p className="font-bold text-amber-300 text-[11px]">Carlos (Gerente)</p>
                    <p className="text-[9px] text-slate-400">Senha: 123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('superadmin@vendix.com.br', 'admin')}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                  >
                    <p className="font-bold text-indigo-300 text-[11px]">Suporte SaaS</p>
                    <p className="text-[9px] text-slate-400">Senha: admin</p>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Beatriz Albuquerque"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail para Acesso</label>
                <input
                  type="email"
                  placeholder="beatriz@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Criar Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 3 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 90000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Perfil / Cargo</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="admin">Administrador Geral</option>
                    <option value="manager">Gerente de Loja</option>
                    <option value="cashier">Operador de Caixa</option>
                    <option value="stockist">Estoquista</option>
                    <option value="salesperson">Vendedor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Filial de Lotação</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.01]"
              >
                Finalizar Cadastro & Acessar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
