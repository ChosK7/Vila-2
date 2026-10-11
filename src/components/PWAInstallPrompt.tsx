import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';
import { audio } from '../utils/audio';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  const handleInstallClick = () => {
    audio.playWood();
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      installApp();
    }
  };

  return (
    <>
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-[#FDFBF7]/95 backdrop-blur-md border-2 border-[#33261D] rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 max-w-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-800/30 flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-amber-900" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-black text-stone-900 truncate font-hand">
              Instalar App Vila Ancestral
            </h4>
            <p className="text-[10px] text-stone-600 leading-tight">
              Jogue em tela cheia e sem barra de navegação no celular!
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-transform active:scale-95 shrink-0"
            title="Instalar aplicativo"
          >
            <Download size={13} />
            <span>Instalar</span>
          </button>

          <button
            onClick={() => {
              audio.playWood();
              setIsDismissed(true);
            }}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border-3 border-[#33261D] rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-200 mb-3">
              <h3 className="font-hand font-extrabold text-base text-stone-900 flex items-center gap-2">
                <span>📲</span> Como Instalar no iPhone/iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-stone-400 hover:text-stone-800 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="text-xs text-stone-800 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-900">1.</span>
                <span>Toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) na barra do Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-900">2.</span>
                <span>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-900">3.</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-amber-400 hover:bg-amber-500 font-black text-xs text-stone-900 rounded-xl border-2 border-[#33261D] cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
