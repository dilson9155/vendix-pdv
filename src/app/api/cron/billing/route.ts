import { NextResponse } from "next/server";
import { runBillingEnforcement } from "@/services/billing.service";

export const dynamic = "force-dynamic";

/**
 * Rotina diária de cobrança (Vercel Cron).
 *
 * Configure `CRON_SECRET` na Vercel: o cron envia
 * `Authorization: Bearer <CRON_SECRET>`. Sem o segredo, o endpoint continua
 * acessível para facilitar o primeiro deploy — proteja-o em produção.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
  }

  try {
    const result = await runBillingEnforcement();
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na rotina de cobrança.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
