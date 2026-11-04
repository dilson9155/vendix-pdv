import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  title?: string;
  /** When false the gradient mark is rendered without the dark rounded plate. */
  plate?: boolean;
};

/**
 * Marca Vendix: apenas o "V" em degradê ciano/azul, sem o wordmark.
 * As definições de gradiente são duplicadas por instância com o mesmo id —
 * os valores são idênticos, então o resultado visual é sempre o mesmo.
 */
export function VendixMark({ className, title, plate = true }: Props) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-10 shrink-0", className)}
      role="img"
      aria-label={title ?? "Vendix"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vx-plate" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C1B36" />
          <stop offset="1" stopColor="#050912" />
        </linearGradient>
        <radialGradient
          id="vx-aura"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(350 148) rotate(128) scale(330)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22D3EE" stopOpacity=".34" />
          <stop offset=".55" stopColor="#1D4ED8" stopOpacity=".12" />
          <stop offset="1" stopColor="#1D4ED8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vx-left" x1="146" y1="156" x2="256" y2="356" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B8CFF" />
          <stop offset=".55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1029B8" />
        </linearGradient>
        <linearGradient id="vx-top" x1="372" y1="150" x2="318" y2="250" gradientUnits="userSpaceOnUse">
          <stop stopColor="#53F7E5" />
          <stop offset="1" stopColor="#22CFF5" />
        </linearGradient>
        <linearGradient
          id="vx-bottom"
          x1="318"
          y1="242"
          x2="256"
          y2="356"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1734C0" />
        </linearGradient>
        <filter id="vx-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#000814" floodOpacity=".55" />
        </filter>
      </defs>

      {plate && (
        <>
          <rect width="512" height="512" rx="118" fill="url(#vx-plate)" />
          <rect width="512" height="512" rx="118" fill="url(#vx-aura)" />
          <rect
            x="1.5"
            y="1.5"
            width="509"
            height="509"
            rx="116.5"
            fill="none"
            stroke="#fff"
            strokeOpacity=".09"
          />
        </>
      )}

      <g filter={plate ? "url(#vx-shadow)" : undefined}>
        <path
          d="M372 150 318 250"
          fill="none"
          stroke="url(#vx-top)"
          strokeWidth="88"
          strokeLinecap="round"
        />
        <path
          d="M318 242 256 356"
          fill="none"
          stroke="url(#vx-bottom)"
          strokeWidth="88"
          strokeLinecap="butt"
        />
        <path
          d="M146 156 256 356"
          fill="none"
          stroke="url(#vx-left)"
          strokeWidth="88"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M279 221 357 263"
        fill="none"
        stroke="#020A1A"
        strokeOpacity=".35"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M125 184 227 349"
        fill="none"
        stroke="#DBEAFE"
        strokeOpacity=".24"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M387 181 286 348"
        fill="none"
        stroke="#ECFEFF"
        strokeOpacity=".18"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
