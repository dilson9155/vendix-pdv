import { getPublicCharge } from "@/services/billing.service";
import { buildChargePdf, pdfResponse } from "@/services/pdf.service";
import { publicChargeUrl } from "@/lib/app-url";
import { formatDateBR } from "@/lib/date";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  VENCIDA: "Vencida",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await getPublicCharge(token).catch(() => null);
  if (!data) {
    return new Response("Cobrança não encontrada.", { status: 404 });
  }

  const { charge, pix } = data;
  const bytes = await buildChargePdf({
    tenantName: charge.tenant.name,
    description: charge.description,
    referenceMonth: charge.referenceMonth,
    amount: formatBRL(charge.amount),
    dueDate: formatDateBR(charge.dueDate),
    status: STATUS_LABELS[charge.status] ?? charge.status,
    boletoCode: charge.boletoCode,
    boletoUrl: charge.boletoUrl,
    pixKey: pix?.key ?? charge.pixKey,
    pixBeneficiary: pix?.beneficiary ?? charge.pixBeneficiary,
    pixPayload: pix?.payload,
    instructions: charge.instructions ?? data.config.boletoInstructions,
    paymentUrl: publicChargeUrl(charge.publicToken),
  });

  const safeMonth = charge.referenceMonth.replace(/[^0-9A-Za-z-]/g, "-");
  return pdfResponse(bytes, `cobranca-${safeMonth}-${charge.publicToken.slice(0, 8)}.pdf`);
}
