import React, { useState } from 'react';
import { Sale } from '../types';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import { Printer, Share2, X, Check, Copy } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { currentTenant, currentBranch } = useApp();
  const [format, setFormat] = useState<'58mm' | '80mm'>(currentTenant.settings.receiptFormat || '80mm');
  const [copied, setCopied] = useState(false);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp formatted message & URL
  const whatsappPhone = sale.customerId
    ? sale.customerName
    : currentTenant.settings.whatsappPhone;

  const itemsSummaryText = sale.items
    .map((item) => `• ${item.quantity}x ${item.productName} - ${formatBRL(item.totalPrice)}`)
    .join('\n');

  const paymentsSummaryText = sale.payments
    .map((p) => `• ${p.paymentMethod.toUpperCase()}: ${formatBRL(p.amount)}`)
    .join('\n');

  const whatsappMessage = `*${currentTenant.tradeName || currentTenant.name}*\n` +
    `*Comprovante de Venda #${sale.saleNumber}*\n` +
    `Data: ${new Date(sale.createdAt).toLocaleString('pt-BR')}\n` +
    `Cliente: ${sale.customerName}\n\n` +
    `*Itens:*\n${itemsSummaryText}\n\n` +
    `*Total:* ${formatBRL(sale.total)}\n` +
    `*Pagamento:*\n${paymentsSummaryText}\n\n` +
    `${currentTenant.settings.receiptFooter || 'Vendeu, organizou, cresceu.'}`;

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-sm">Comprovante de Venda #{sale.saleNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Format toggle 58mm / 80mm */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setFormat('58mm')}
                className={`px-2 py-1 rounded-md transition-all font-semibold ${
                  format === '58mm' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58 mm
              </button>
              <button
                onClick={() => setFormat('80mm')}
                className={`px-2 py-1 rounded-md transition-all font-semibold ${
                  format === '80mm' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80 mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container - Screen Preview */}
        <div className="p-6 overflow-y-auto bg-slate-950/70 flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white text-slate-900 font-mono text-[11px] leading-tight p-4 shadow-xl border border-slate-200 transition-all ${
              format === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            {/* Header store info */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-xs uppercase tracking-wider">{currentTenant.tradeName || currentTenant.name}</h2>
              <p className="text-[10px] text-slate-600">{currentBranch.name}</p>
              <p className="text-[9px] text-slate-500">{currentBranch.address} - {currentBranch.city}/{currentBranch.state}</p>
              <p className="text-[9px] text-slate-500">CNPJ: {currentTenant.cnpjCpf} | Tel: {currentBranch.phone}</p>
            </div>

            {/* Sale metadata */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
              <div className="flex justify-between">
                <span>VENDA: #{sale.saleNumber}</span>
                <span>{new Date(sale.createdAt).toLocaleDateString('pt-BR')} {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>OPERADOR: {sale.cashierName}</span>
                <span>VENDEDOR: {sale.salespersonName || '-'}</span>
              </div>
              <div className="truncate">
                <span>CLIENTE: {sale.customerName}</span>
              </div>
            </div>

            {/* Items table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[9px] border-b border-slate-200 pb-1 mb-1">
                <span className="col-span-6">ITEM</span>
                <span className="col-span-2 text-center">QTD</span>
                <span className="col-span-2 text-right">UNIT</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[10px] py-0.5">
                  <div className="col-span-6 truncate font-medium">
                    {item.productName}
                  </div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">{item.unitPrice.toFixed(2)}</div>
                  <div className="col-span-2 text-right font-semibold">{item.totalPrice.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatBRL(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>DESCONTO:</span>
                  <span>- {formatBRL(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span>{formatBRL(sale.total)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
              <span className="font-bold text-[9px]">PAGAMENTO:</span>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="uppercase">{p.paymentMethod} {p.installments > 1 ? `(${p.installments}x)` : ''}:</span>
                  <span>{formatBRL(p.amount)}</span>
                </div>
              ))}
            </div>

            {/* Footer legal & thanks */}
            <div className="pt-3 text-center space-y-1 text-[9px] text-slate-500">
              <p className="font-semibold text-slate-800">{currentTenant.settings.receiptFooter || 'Obrigado pela preferência!'}</p>
              <p className="italic text-[8px]">*** COMPROVANTE NÃO FISCAL DE VENDA ***</p>
              <p className="text-[8px] text-slate-400">Vendix Retail - "Vendeu, organizou, cresceu."</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar via WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/40 transition-all hover:scale-[1.02]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Térmica</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
