import QRCode from "qrcode";

/**
 * QR Code do PIX renderizado no servidor em SVG.
 * O conteúdo é gerado por nós (BR Code), nunca vem de HTML de terceiros.
 */
export async function PixQr({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <div
      className={className}
      role="img"
      aria-label="QR Code para pagamento via PIX"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
