import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, KeyRound, Receipt } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listPlans } from "@/services/saas.service";
import { formatBRL } from "@/lib/money";
import { PageHeader } from "@/components/page-blocks";
import { TenantForm } from "@/components/admin/tenant-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nova loja" };
export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  await requirePlatformAdmin();
  const plans = await listPlans(false);

  if (plans.length === 0) {
    return (
      <div>
        <PageHeader title="Nova loja" description="Cadastre uma nova loja na plataforma." />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Nenhum plano ativo encontrado. Cadastre um plano antes de criar a loja.
          <div className="mt-3">
            <Button asChild size="sm">
              <Link href="/admin/planos">Ir para planos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Nova loja"
        description="A loja já nasce com matriz, perfis de acesso, plano de contas, caixa e formas de pagamento."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/empresas">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <TenantForm
            mode="create"
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: formatBRL(plan.price),
              trialDays: plan.trialDays,
            }))}
          />
        </section>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Building2 className="size-4 text-primary" /> O que é criado
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>• Loja e filial matriz</li>
              <li>• Perfis de acesso padrão</li>
              <li>• Usuário administrador</li>
              <li>• Plano de contas e caixa</li>
              <li>• Formas de pagamento e preferências</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-semibold">
              <KeyRound className="size-4 text-primary" /> Acesso inicial
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              O responsável acessa com o e-mail e a senha informados aqui. Oriente a trocar a
              senha no primeiro acesso.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Receipt className="size-4 text-primary" /> Próximo passo
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Depois de cadastrar, emita a primeira mensalidade em Cobranças. O link de pagamento
              já sai com PIX (QR Code) e boleto, quando cadastrados.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
