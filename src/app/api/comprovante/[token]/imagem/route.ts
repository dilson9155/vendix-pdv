import { NextResponse } from "next/server";
import { getPublicReceipt } from "@/services/sales.service";
import { renderReceiptJpeg } from "@/services/receipt-image.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cupom em JPEG de um comprovante compartilhado.
 * O token é a autorização: links expiram e podem ser revogados.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getPublicReceipt(token);
  if (!result) {
    return NextResponse.json({ error: "Comprovante indisponível." }, { status: 404 });
  }

  const jpeg = await renderReceiptJpeg(result.receipt);
  const fileName = `cupom-${result.receipt.documentNumber.replace(/[^\w-]+/g, "-")}.jpg`;
  const download = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.byteLength),
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}
