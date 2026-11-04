/**
 * Credenciais de demonstração só aparecem quando explicitamente habilitadas no
 * ambiente. Nunca exibimos senhas por padrão.
 */
export function DemoCredentialsHint() {
  if (process.env.SHOW_DEMO_CREDENTIALS !== "true") return null;
  const email = (process.env.SEED_DEMO_EMAIL || "admin@demo.vendix.app").toLowerCase();
  return (
    <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
      <p className="font-semibold">Ambiente de demonstração</p>
      <p className="mt-1">
        Empresa: <strong>{email}</strong> — a senha foi definida na variável{" "}
        <code>SEED_DEMO_PASSWORD</code> do ambiente.
      </p>
      <p className="mt-1">Os dados da empresa demo são fictícios e identificados como demonstração.</p>
    </div>
  );
}
