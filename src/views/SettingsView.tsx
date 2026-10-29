import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { testSupabaseConnection, getSupabaseConfig } from '../services/supabase';
import {
  Settings,
  Building,
  Printer,
  MessageCircle,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Save,
  Check,
  AlertTriangle,
  Lock,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SettingsViewProps {
  onNavigate?: (view: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { currentTenant, updateTenantSettings, currentBranch, currentUser, saveUser } = useApp();

  // Company info state
  const [tradeName, setTradeName] = useState(currentTenant.tradeName || currentTenant.name);
  const [cnpj, setCnpj] = useState(currentTenant.cnpjCpf);
  const [phone, setPhone] = useState(currentTenant.phone);

  // PDV Settings
  const [receiptFormat, setReceiptFormat] = useState<'58mm' | '80mm'>(
    currentTenant.settings.receiptFormat || '80mm'
  );
  const [receiptFooter, setReceiptFooter] = useState(currentTenant.settings.receiptFooter || '');
  const [allowNegativeStock, setAllowNegativeStock] = useState(
    currentTenant.settings.allowNegativeStock || false
  );
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(
    currentTenant.settings.autoPrintReceipt || false
  );
  const [enableCrediario, setEnableCrediario] = useState(
    currentTenant.settings.enableCrediario !== false
  );

  // WhatsApp template
  const [whatsappPhone, setWhatsappPhone] = useState(currentTenant.settings.whatsappPhone || '');
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    currentTenant.settings.whatsappMessageTemplate || ''
  );

  const isSuperAdmin = currentUser.role === 'superadmin';

  // Supabase connection state
  const initialSupabase = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabase.url);
  const [supabaseKey, setSupabaseKey] = useState(initialSupabase.anonKey);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Password state for current account
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!newPasswordInput || newPasswordInput.length < 3) {
      setPasswordFeedback({ message: 'A senha de acesso deve ter pelo menos 3 caracteres.', type: 'error' });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordFeedback({ message: 'A confirmação de senha não coincide.', type: 'error' });
      return;
    }

    saveUser({
      ...currentUser,
      password: newPasswordInput,
    });

    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordFeedback({ message: 'Senha de acesso atualizada com sucesso!', type: 'success' });
    setTimeout(() => setPasswordFeedback(null), 3500);
  };

  // Save Settings
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      receiptFormat,
      receiptFooter,
      allowNegativeStock,
      autoPrintReceipt,
      enableCrediario,
      whatsappPhone,
      whatsappMessageTemplate: whatsappTemplate,
    });

    // ONLY Super Admin is permitted to update Supabase connection parameters
    if (isSuperAdmin) {
      localStorage.setItem('vendix_supabase_url', supabaseUrl.trim());
      localStorage.setItem('vendix_supabase_key', supabaseKey.trim());
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    setTestStatus({ testing: true });
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setTestStatus({ testing: false, success: res.success, message: res.message });
  };

  const sqlSample = `-- VENDIX SaaS PostgreSQL Migration & RLS Policies
-- Execute no Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cnpj_cpf VARCHAR(20) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- Ver arquivo completo em /supabase/migrations/20261028_vendix_schema_and_rls.sql`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSample);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <span>Configurações do Sistema</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSuperAdmin
              ? 'Personalização da empresa, formato de impressão térmica, WhatsApp e credenciais do banco Supabase.'
              : 'Personalização da filial/empresa, formato de impressão térmica e WhatsApp.'}
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dados da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia / Loja</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">CNPJ ou CPF</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Telefone Principal</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Quick SaaS Admin Link - Strictly Super Admin only */}
          {isSuperAdmin && onNavigate && (
            <div className="mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-purple-300 block">Deseja cadastrar uma nova empresa ou tenant?</span>
                <span className="text-slate-400 text-[11px]">
                  No painel de Administração SaaS você cria novas lojas, vincula assinaturas e gerencia cobranças.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('saas_admin')}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                + Ir para Cadastro de Empresas (SaaS)
              </button>
            </div>
          )}
        </div>

        {/* Access Password & Security Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Segurança & Senha de Acesso
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Usuário: <span className="text-slate-200 font-bold">{currentUser.email}</span>
            </span>
          </div>

          {passwordFeedback && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">Nova Senha de Acesso</label>
                <button
                  type="button"
                  onClick={() => {
                    const pass = Math.random().toString(36).slice(-6) + '!';
                    setNewPasswordInput(pass);
                    setConfirmPasswordInput(pass);
                    setShowPasswordInput(true);
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline font-medium"
                >
                  Gerar Senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasswordInput ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(!showPasswordInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title={showPasswordInput ? 'Ocultar Senha' : 'Ver Senha'}
                >
                  {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Confirmar Nova Senha</label>
              <input
                type={showPasswordInput ? 'text' : 'password'}
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleUpdatePassword}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/50 transition-all hover:scale-[1.02]"
            >
              <Key className="w-3.5 h-3.5 text-purple-200" />
              <span>Atualizar Senha de Acesso</span>
            </button>
          </div>
        </div>

        {/* PDV & Thermal Printer Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Printer className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              PDV & Impressão Térmica
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Formato Padrão do Comprovante</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setReceiptFormat('58mm')}
                  className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                    receiptFormat === '58mm'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  58 mm (Bobina Estreita)
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptFormat('80mm')}
                  className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                    receiptFormat === '80mm'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  80 mm (Bobina Larga Padrão)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mensagem de Rodapé do Cupom</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Ex: Obrigado pela preferência! Volte sempre."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <span>Permitir venda com estoque negativo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableCrediario}
                  onChange={(e) => setEnableCrediario(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <span>Habilitar modalidade de Crediário Próprio da Loja</span>
              </label>
            </div>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Compartilhamento WhatsApp
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Número do WhatsApp Comercial da Loja (com DDI e DDD)
              </label>
              <input
                type="text"
                placeholder="Ex: 5511988221044"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Modelo da Mensagem do Comprovante (Tags disponíveis: &#123;cliente&#125;, &#123;numero_venda&#125;, &#123;valor&#125;, &#123;link&#125;)
              </label>
              <textarea
                rows={2}
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Supabase Database Connection - STRICTLY RESTRICTED TO SUPER ADMIN */}
        {isSuperAdmin ? (
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Conexão Supabase PostgreSQL & RLS
                </h3>
              </div>
              <span className="text-[10px] bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-purple-300 font-bold">
                Exclusivo Super Admin
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">SUPABASE_URL</label>
                <input
                  type="text"
                  placeholder="https://seu-projeto.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  SUPABASE_ANON_KEY (Chave Pública Anon)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Connection Test Output */}
              {testStatus.message && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testStatus.success
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testStatus.testing}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold border border-emerald-500/30 transition-colors"
                >
                  {testStatus.testing ? 'Testando Conexão...' : 'Testar Conexão Supabase'}
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Migration SQL'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Locked banner for Filiais and non-superadmins */
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Infraestrutura & Banco de Dados Supabase
                </h4>
                <p className="text-[11px] text-slate-400">
                  As configurações do Supabase e sincronização central na nuvem são restritas exclusivamente ao Super Admin da plataforma.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
              Restrito ao Super Admin
            </span>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xl shadow-purple-950/40 transition-all hover:scale-[1.02]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
