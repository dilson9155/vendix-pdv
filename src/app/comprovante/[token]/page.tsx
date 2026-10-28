import type { Metadata } from "next";
import Link from "next/link";
import { getPublicReceipt } from "@/services/sales.service";
import { ReceiptView } from "@/components/receipt-view";
import { PrintControls } from "@/components/print-controls";
import { formatDateTimeBR } from "@/lib/date";

export const metadata: Metadata = {
  title: "Comprovante",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicReceipt(token);

  if (!result) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Link indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este comprovante não existe, expirou ou foi revogado. Peça um novo link à loja.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Acessar o Vendix
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/40 px-3 py-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[560px]">
        <div className="no-print mb-3 text-center">
          <p className="text-xs text-muted-foreground">
            Comprovante compartilhado pela loja · válido até {formatDateTimeBR(result.expiresAt)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-2 shadow-sm print:border-0 print:shadow-none">
          <ReceiptView receipt={result.receipt} />
        </div>
        <div className="mt-4">
          <PrintControls />
        </div>
        <p className="no-print mt-4 text-center text-[10px] text-muted-foreground">
          Este link é pessoal e expira automaticamente. Não o compartilhe publicamente.
        </p>
      </div>
    </main>
  );
}
