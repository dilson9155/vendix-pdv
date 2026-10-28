/**
 * Credenciais de demonstração só aparecem quando explicitamente habilitadas no
 * ambiente. Nunca exibimos senhas por padrão.
 */
export function DemoCredentialsHint() {
  if (process.env.SHOW_DEMO_CREDENTIALS !== "true") return null;
  return (
    <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-violet-900">
      <p className="font-semibold">Ambiente de demonstração</p>
      <p className="mt-1">
        Empresa: <strong>demo@vendix.com.br</strong> — a senha foi definida na variável{" "}
        <code>SEED_DEMO_PASSWORD</code> do ambiente.
      </p>
      <p className="mt-1">Os dados da empresa demo são fictícios e identificados como demonstração.</p>
    </div>
  );
}
