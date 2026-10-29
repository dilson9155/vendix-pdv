import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'menu' | 'compact' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'menu' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else {
      // Show instructional modal if prompt is not directly available (e.g., iOS or already prompted)
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    if (variant === 'header') {
      return (
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
          <img src="/logo.png" alt="Vendix" className="w-4 h-4 rounded-md object-contain" />
          <span>App Instalado</span>
        </div>
      );
    }
    return (
      <div className="mx-2 my-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5">
        <img
          src="/logo.png"
          alt="Vendix"
          className="w-7 h-7 rounded-lg object-contain shadow border border-emerald-500/40 bg-slate-900"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            App Instalado
          </p>
          <p className="text-[10px] text-emerald-400/80 truncate">Modo PWA Ativo</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {variant === 'header' ? (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-[11px] text-purple-200 hover:text-white font-semibold transition-all shadow-sm"
          title="Instalar Aplicativo VENDIX"
        >
          <img
            src="/logo.png"
            alt="Vendix"
            className="w-4 h-4 rounded-md object-contain"
          />
          <Download className="w-3.5 h-3.5 text-purple-300" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      ) : (
        <div className="mx-2 my-2 p-2.5 rounded-2xl bg-gradient-to-br from-purple-900/50 via-slate-900 to-indigo-900/40 border border-purple-500/40 shadow-lg shadow-purple-950/30">
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="/logo.png"
              alt="Ícone Vendix"
              className="w-9 h-9 rounded-xl object-contain shadow-md border border-purple-400/40 bg-slate-950 p-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-white tracking-wide block truncate">
                VENDIX App
              </span>
              <p className="text-[10px] text-purple-200 truncate">
                Instale no seu celular ou PC
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-purple-900/50 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-100" />
            <span>{isInstalling ? 'Instalando...' : 'Instalar Aplicativo (PWA)'}</span>
          </button>
        </div>
      )}

      {/* Instructional Modal for iOS or manual install */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <img
                src="/logo.png"
                alt="Vendix"
                className="w-14 h-14 rounded-2xl mx-auto mb-2 object-contain shadow-lg border border-purple-500/40 bg-slate-950 p-1"
              />
              <h4 className="text-base font-black text-white font-['Montserrat']">
                Instalar Aplicativo VENDIX
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Acesse o PDV e gestão como um aplicativo nativo em tela cheia!
              </p>
            </div>

            <div className="space-y-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 text-xs">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-200">
                      Toque no botão <strong className="text-purple-300">Compartilhar</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5" />) na barra inferior do Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-200">
                      Role para baixo e selecione <strong className="text-purple-300">Adicionar à Tela de Início</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-200">
                      Confirme em <strong className="text-purple-300">Adicionar</strong> no canto superior direito.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-200">
                      No seu navegador (Chrome, Edge ou Brave), clique nos <strong>3 pontinhos</strong> do menu no canto superior.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-200">
                      Clique em <strong className="text-purple-300">"Instalar Vendix PDV"</strong> ou <strong className="text-purple-300">"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-200">
                      O ícone do VENDIX será criado na sua área de trabalho/tela de apps.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
