import React from 'react';
import { useApp } from '../context/AppContext';
import { Printer, X, Download } from 'lucide-react';

export interface ReportColumn {
  header: string;
  accessor?: (row: any) => string | number | React.ReactNode;
  key?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ReportSummaryItem {
  label: string;
  value: string;
  color?: string;
}

export type ReportSummaryCard = ReportSummaryItem;

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  period?: string;
  columns: ReportColumn[];
  data: any[];
  summary?: ReportSummaryItem[];
  summaryCards?: ReportSummaryItem[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  period,
  columns,
  data,
  summary,
  summaryCards,
}) => {
  const { currentTenant, currentBranch, currentUser } = useApp();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeSummary = summaryCards || summary;

  const storeLogo = currentTenant.settings.logoUrl || '/logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Toolbar - Hidden during print */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Visualização de Impressão do Relatório</h3>
              <p className="text-[11px] text-slate-400">
                O logotipo e os dados da empresa {currentTenant.tradeName || currentTenant.name} estão inclusos no cabeçalho.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-950/40 transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 print:p-0 print:bg-white flex justify-center">
          <div
            id="printable-report"
            className="bg-white text-slate-900 w-full max-w-3xl p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs"
          >
            {/* Report Header with Store Logo & Metadata */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between border-b-2 border-slate-800 pb-4 mb-4 gap-4">
              <div className="flex items-center gap-4">
                {/* Store Logo */}
                {storeLogo && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={storeLogo}
                      alt={currentTenant.tradeName || currentTenant.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase font-['Montserrat']">
                    {currentTenant.tradeName || currentTenant.name}
                  </h1>
                  <p className="text-slate-600 font-semibold text-xs mt-0.5">{currentBranch.name}</p>
                  <p className="text-slate-500 text-[11px]">
                    CNPJ: {currentTenant.cnpjCpf} {currentBranch.phone ? `| Tel: ${currentBranch.phone}` : ''}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {currentBranch.address} - {currentBranch.city}/{currentBranch.state}
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-black rounded-lg uppercase tracking-wider text-[10px]">
                  Relatório Gerencial
                </span>
                <p className="text-slate-500 text-[10px] mt-1.5">
                  Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-slate-500 text-[10px]">Operador: {currentUser.fullName}</p>
              </div>
            </div>

            {/* Report Title & Subtitle */}
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
              {period && <p className="text-xs text-purple-700 font-semibold mt-0.5">Período: {period}</p>}
            </div>

            {/* Summary Cards */}
            {activeSummary && activeSummary.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {activeSummary.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {item.label}
                    </span>
                    <strong className={`text-sm font-black mt-1 block ${item.color || 'text-slate-900'}`}>
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {/* Main Data Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className={`p-2.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-6 text-slate-400 italic">
                        Nenhum registro encontrado para este relatório.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {columns.map((col, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-2.5 text-slate-800 ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {col.accessor ? col.accessor(row) : (col.key ? row[col.key] : '')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
              <span>
                VENDIX Retail - Sistema de Gestão e Frente de Caixa Multi-Lojas
              </span>
              <span>Total de Registros: {data.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
