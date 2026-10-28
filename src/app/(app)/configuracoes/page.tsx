import type { Metadata } from "next";
import { requirePermission } from "@/lib/tenant";
import { getCompany, getTenantPreferences, listBranches } from "@/services/settings.service";
import { getWhatsAppStatus, listWhatsAppLogs } from "@/services/whatsapp.service";
import { CompanyForm } from "@/components/settings/company-form";
import { BranchForm } from "@/components/settings/branch-form";
import { WhatsAppForm } from "@/components/settings/whatsapp-form";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requirePermission("settings.view");
  const [company, preferences, branches, whatsapp, logs] = await Promise.all([
    getCompany(ctx.tenantId),
    getTenantPreferences(ctx.tenantId),
    listBranches(ctx.tenantId),
    getWhatsAppStatus(ctx),
    listWhatsAppLogs(ctx, 20),
  ]);

  const branchesList = branches;

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Configurações"
        description="Empresa, unidades, preferências de operação e integrações (WhatsApp)."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plano" value={company.plan?.name ?? "—"} hint={company.subscription?.status ? `Assinatura ${company.subscription.status}` : "Sem assinatura"} />
        <StatCard label="Unidades" value={String(branchesList.length)} />
        <StatCard label="Formato comprovante" value={preferences.receiptWidth} />
        <StatCard label="WhatsApp" value={whatsapp.configured ? "Configurado" : "Não configurado"} tone={whatsapp.configured ? "positive" : "warning"} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Empresa</h2>
          <div className="mt-3">
            <CompanyForm />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">WhatsApp</h2>
          <div className="mt-3 space-y-4">
            <WhatsAppForm status={whatsapp} />
            <p className="text-xs text-muted-foreground">
              Status atual: <StatusBadge status={whatsapp.configured ? "ATIVO" : "INATIVO"} /> · fonte:{" "}
              {whatsapp.source === "environment" ? "variáveis de ambiente" : whatsapp.source === "tenant" ? "empresa" : "nenhuma"}
            </p>
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <TableShell caption="Logs de WhatsApp">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Evento</th>
                      <th>Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.createdAt).toISOString().slice(0, 10)}</td>
                        <td>{log.status}</td>
                        <td>{log.provider}</td>
                        <td className="max-w-72 truncate">{log.error ?? log.messageId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              </div>
            ) : (
              <EmptyState title="Sem logs" description="Integrações e envios aparecem aqui." />
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Unidades</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <BranchForm />
          <div className="overflow-x-auto">
            <TableShell caption="Unidades">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {branchesList.map((branch) => (
                  <tr key={branch.id}>
                    <td className="font-medium">{branch.code}</td>
                    <td>{branch.name}</td>
                    <td>
                      <StatusBadge status={branch.status === "ATIVO" ? "ATIVO" : "INATIVO"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Para editar uma unidade, utilize a listagem de filiais no cadastro.</p>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Preferências operacionais</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Estoque negativo permitido</dt>
            <dd className="mt-0.5 font-semibold">{preferences.allowNegativeStock ? "Sim" : "Não"}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Desconto máximo</dt>
            <dd className="mt-0.5 font-semibold">{formatBRL(preferences.maxDiscountPercent)}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Cliente exigido para prazo</dt>
            <dd className="mt-0.5 font-semibold">{preferences.requireCustomerOnCredit ? "Sim" : "Não"}</dd>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">Rodapé do comprovante</dt>
            <dd className="mt-0.5 font-semibold">{preferences.receiptFooter}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
