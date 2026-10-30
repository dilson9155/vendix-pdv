import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile, UserRole } from '../types';
import {
  ShieldCheck,
  User,
  Plus,
  Shield,
  Building,
  Key,
  History,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  X,
  LogIn,
  Check,
} from 'lucide-react';
import { LoginModal } from '../components/LoginModal';

const AVAILABLE_PERMISSIONS = [
  { id: 'pos_sale', label: 'Operar PDV (Vendas)', desc: 'Pode abrir caixa e efetuar vendas no balcão' },
  { id: 'discounts', label: 'Conceder Descontos', desc: 'Autorizado a aplicar descontos manuais em itens e total' },
  { id: 'cancel_sale', label: 'Cancelar Vendas', desc: 'Pode estornar cupons e vendas realizadas' },
  { id: 'finance', label: 'Módulo Financeiro', desc: 'Acesso a contas a pagar/receber, baixas e livro caixa' },
  { id: 'inventory', label: 'Controle de Estoque', desc: 'Ajuste de inventário e entrada/saída de mercadorias' },
  { id: 'reports', label: 'Relatórios & DRE', desc: 'Visualização de relatórios gerenciais e balancetes' },
  { id: 'settings', label: 'Configurações do Sistema', desc: 'Ajustes fiscais, impressora térmica e filiais' },
];

export const UsersView: React.FC = () => {
  const {
    users,
    auditLogs,
    branches,
    currentTenant,
    switchUserRole,
    currentUser,
    saveUser,
    deleteUser,
    loginUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // User form state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['pos_sale']);

  // Change password modal state
  const [targetUserForPassword, setTargetUserForPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('cashier');
    setBranchId(branches[0]?.id || '');
    setIsActive(true);
    setSelectedPermissions(['pos_sale', 'discounts']);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setEmail(u.email);
    setPassword(u.password || '');
    setPhone(u.phone || '');
    setRole(u.role);
    setBranchId(u.branchId);
    setIsActive(u.isActive);
    setSelectedPermissions(u.permissions || ['pos_sale']);
    setIsUserModalOpen(true);
  };

  const handleOpenPasswordModal = (u: UserProfile) => {
    setTargetUserForPassword(u);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      showToast('Nome e e-mail são obrigatórios.', 'error');
      return;
    }

    if (!editingUserId && (!password || password.length < 3)) {
      showToast('A senha deve ter pelo menos 3 caracteres.', 'error');
      return;
    }

    const payload: Partial<UserProfile> = {
      ...(editingUserId ? { id: editingUserId } : {}),
      fullName,
      email,
      phone,
      role,
      branchId,
      tenantId: currentTenant.id,
      isActive,
      permissions: selectedPermissions,
    };

    if (password) {
      payload.password = password;
    }

    saveUser(payload);
    setIsUserModalOpen(false);
    showToast(editingUserId ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado com sucesso!');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPassword) return;

    if (!newPassword || newPassword.length < 3) {
      showToast('A nova senha deve ter pelo menos 3 dígitos.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('A confirmação da senha não confere.', 'error');
      return;
    }

    saveUser({
      id: targetUserForPassword.id,
      password: newPassword,
    });

    setIsPasswordModalOpen(false);
    showToast(`Senha de ${targetUserForPassword.fullName} alterada com sucesso!`);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleQuickLoginAs = async (u: UserProfile) => {
    if (u.password) {
      const res = await loginUser(u.email, u.password);
      if (res.success) {
        showToast(`Sessão iniciada como ${u.fullName} (${u.role})`);
      } else {
        switchUserRole(u.role);
        showToast(`Perfil alterado para ${u.role}`);
      }
    } else {
      switchUserRole(u.role);
      showToast(`Perfil alterado para ${u.role}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold transition-all ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950 border-rose-500/50 text-rose-200'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span>Usuários, Autenticação & Permissões</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro completo de e-mail e senha, controle de papéis (RBAC), filiais autorizadas e trilha de auditoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
            title="Abrir tela de login com e-mail e senha"
          >
            <LogIn className="w-4 h-4 text-purple-400" />
            <span>Fazer Login</span>
          </button>

          <button
            onClick={handleOpenCreateUser}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Active Session Indicator Card */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/30 border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-base">
            {(currentUser?.fullName || 'U').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{currentUser?.fullName || 'Usuário'}</span>
              <span className="bg-purple-600/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 uppercase">
                {currentUser?.role || 'admin'}
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sessão Conectada
              </span>
            </div>
            <p className="text-xs text-slate-400">{currentUser?.email || 'admin@vendix.com.br'}</p>
          </div>
        </div>

        {currentUser?.role === 'superadmin' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-purple-300 font-semibold hidden md:inline">Alternar papel (Teste Super Admin):</span>
            <select
              value={currentUser?.role || 'admin'}
              onChange={(e) => switchUserRole(e.target.value as UserRole)}
              className="bg-slate-800 border border-purple-500/40 text-purple-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="superadmin">Super Admin (Plataforma)</option>
              <option value="admin">Administrador Geral</option>
              <option value="manager">Gerente de Loja</option>
              <option value="cashier">Operador de Caixa</option>
              <option value="stockist">Estoquista</option>
              <option value="salesperson">Vendedor</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Equipe e Usuários ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Trilha de Auditoria ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Cargo:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Todos os Cargos</option>
                {currentUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="cashier">Caixa</option>
                <option value="stockist">Estoquista</option>
                <option value="salesperson">Vendedor</option>
              </select>
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              const branch = branches.find((b) => b.id === u.branchId);

              return (
                <div
                  key={u.id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all hover:border-slate-700 ${
                    isCurrent ? 'border-purple-500 shadow-purple-950/30' : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                          {(u.fullName || 'U').charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{u.fullName || 'Usuário'}</h4>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          u.role === 'superadmin'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : u.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : u.role === 'manager'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : u.role === 'cashier'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 py-2.5 border-y border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span>Filial:</span>
                        </span>
                        <strong className="text-slate-200">{branch?.name || 'Matriz'}</strong>
                      </div>

                      {u.phone && (
                        <div className="flex items-center justify-between">
                          <span>Telefone:</span>
                          <span className="text-slate-300">{u.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            u.isActive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="w-3 h-3" /> Ativo
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" /> Inativo
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Permissões:</span>
                        <span className="text-purple-300 font-mono text-[10px]">
                          {u.permissions?.length || 0} módulos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 pt-2 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Editar Dados e Permissões"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 transition-colors"
                        title="Alterar Senha"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {users.length > 1 && !isCurrent && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir o usuário ${u.fullName}?`)) {
                              deleteUser(u.id);
                              showToast(`Usuário ${u.fullName} excluído.`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isCurrent ? (
                      <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/30">
                        Ativo Agora
                      </span>
                    ) : (
                      <button
                        onClick={() => handleQuickLoginAs(u)}
                        className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 hover:underline"
                      >
                        Acessar como
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider">Trilha de Auditoria do Sistema</span>
            <span className="text-slate-400">Rastreabilidade completa de ações e autorizações</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/40 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px] text-purple-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{log.entityType}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base font-['Montserrat']">
                {editingUserId ? 'Editar Usuário e Permissões' : 'Cadastrar Novo Usuário'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Gabriela Duarte"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">E-mail para Login *</label>
                  <input
                    type="email"
                    placeholder="gabriela@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {editingUserId ? 'Alterar Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUserId ? 'Deixe vazio p/ manter' : 'Mínimo 3 dígitos'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    {...(!editingUserId ? { required: true } : {})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Papel / Cargo</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {currentUser?.role === 'superadmin' && (
                      <option value="superadmin">Super Admin (Plataforma)</option>
                    )}
                    <option value="admin">Administrador Geral</option>
                    <option value="manager">Gerente de Loja</option>
                    <option value="cashier">Operador de Caixa</option>
                    <option value="stockist">Estoquista</option>
                    <option value="salesperson">Vendedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Filial de Atuação</label>
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

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700 focus:ring-purple-500"
                  />
                  <span className="text-slate-300 font-semibold">Usuário com acesso ativo ao sistema</span>
                </label>
              </div>

              {/* Specific permissions checkboxes */}
              <div className="pt-2 border-t border-slate-800">
                <span className="block text-slate-300 font-bold mb-2 uppercase text-[10px] tracking-wider">
                  Permissões de Acesso por Módulo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const checked = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 w-3.5 h-3.5 rounded text-purple-600 bg-slate-800 border-slate-700 focus:ring-purple-500"
                        />
                        <div>
                          <p className="font-semibold text-xs text-white">{perm.label}</p>
                          <p className="text-[10px] text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {isPasswordModalOpen && targetUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Alterar Senha de Acesso</h3>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Definindo nova senha para <strong className="text-white">{targetUserForPassword.fullName}</strong> (
              {targetUserForPassword.email}).
            </p>

            <form onSubmit={handleSavePassword} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 3 dígitos"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-white"
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

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirmar Nova Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login / Auth Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
