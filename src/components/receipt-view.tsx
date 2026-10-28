import { formatDateTimeBR, formatDocument } from "@/lib/date";
import { formatBRL } from "@/lib/money";
import type { ReceiptData } from "@/services/sales.service";

export function ReceiptView({ receipt }: { receipt: ReceiptData }) {
  return (
    <article className="vx-receipt mx-auto w-full max-w-[520px] bg-white p-4 text-black">
      <header className="text-center">
        <p className="text-sm font-bold uppercase">{receipt.company.name}</p>
        {receipt.company.legalName && receipt.company.legalName !== receipt.company.name && (
          <p className="text-[11px]">{receipt.company.legalName}</p>
        )}
        {receipt.company.document && (
          <p className="text-[11px]">CNPJ/CPF: {formatDocument(receipt.company.document)}</p>
        )}
        {receipt.company.address && <p className="text-[11px]">{receipt.company.address}</p>}
        {receipt.company.phone && <p className="text-[11px]">Tel.: {receipt.company.phone}</p>}
        <p className="mt-1 text-[11px]">
          {receipt.company.branchName}
          {receipt.company.branchDocument ? ` · ${formatDocument(receipt.company.branchDocument)}` : ""}
        </p>
      </header>

      <div className="my-2 border-y border-dashed border-black py-1 text-center text-[10px] font-semibold uppercase">
        Comprovante não fiscal · sem valor fiscal
      </div>

      <dl className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt>Documento</dt>
          <dd className="font-bold">{receipt.documentNumber}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Data</dt>
          <dd>{formatDateTimeBR(receipt.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Cliente</dt>
          <dd className="text-right">
            {receipt.customerName ?? "Consumidor final"}
            {receipt.customerDocument ? ` · ${formatDocument(receipt.customerDocument)}` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Operador</dt>
          <dd>{receipt.operatorName}</dd>
        </div>
      </dl>

      <div className="my-2 border-t border-dashed border-black" />

      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-0.5">Item</th>
            <th className="py-0.5 text-right">Qtd</th>
            <th className="py-0.5 text-right">Vl.</th>
            <th className="py-0.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={`${item.sku}-${index}`} className="align-top">
              <td className="py-0.5 pr-1">
                {item.description}
                {item.details ? ` (${item.details})` : ""}
                {item.discount > 0 ? ` · desc. ${formatBRL(item.discount)}` : ""}
              </td>
              <td className="py-0.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-0.5 text-right tabular-nums">{formatBRL(item.unitPrice)}</td>
              <td className="py-0.5 text-right tabular-nums">{formatBRL(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-black" />

      <dl className="space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatBRL(receipt.subtotal)}</dd>
        </div>
        {receipt.discount > 0 && (
          <div className="flex justify-between">
            <dt>Desconto</dt>
            <dd className="tabular-nums">- {formatBRL(receipt.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-black pt-0.5 text-xs font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatBRL(receipt.total)}</dd>
        </div>
        {receipt.payments.map((payment, index) => (
          <div key={`${payment.name}-${index}`} className="flex justify-between">
            <dt>
              {payment.name}
              {payment.installments > 1 ? ` (${payment.installments}x)` : ""}
            </dt>
            <dd className="tabular-nums">{formatBRL(payment.amount)}</dd>
          </div>
        ))}
        {receipt.change > 0 && (
          <div className="flex justify-between">
            <dt>Troco</dt>
            <dd className="tabular-nums">{formatBRL(receipt.change)}</dd>
          </div>
        )}
      </dl>

      {receipt.isDemo && (
        <p className="mt-2 border border-black px-1 py-0.5 text-center text-[10px] font-bold uppercase">
          Empresa de demonstração
        </p>
      )}

      <p className="mt-2 border-t border-dashed border-black pt-1 text-center text-[10px]">
        {receipt.footer}
      </p>
      <p className="mt-1 text-center text-[9px]">
        Documento gerado pelo Vendix · não substitui documento fiscal
      </p>
    </article>
  );
}
