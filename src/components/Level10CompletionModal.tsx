import React, { useEffect } from 'react';
import { Crown, Sparkles, Check } from 'lucide-react';
import { audio } from '../utils/audio';

interface Level10CompletionModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export const Level10CompletionModal: React.FC<Level10CompletionModalProps> = ({
  isOpen,
  onContinue,
}) => {
  useEffect(() => {
    if (isOpen) {
      audio.playFanfare();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in zoom-in-95">
      <div className="relative w-full max-w-sm bg-[#FAF3E7] border-4 border-[#33261D] rounded-3xl shadow-2xl overflow-hidden text-center p-5 space-y-4">
        {/* Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-400 border-3 border-[#33261D] mx-auto flex items-center justify-center shadow-md">
          <Crown size={32} className="text-[#33261D]" />
        </div>

        {/* Header & Description */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold font-hand text-amber-800 uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles size={13} className="text-amber-600" />
            Nível Máximo Alcançado (10)
          </span>
          <h2 className="font-display font-black text-2xl text-[#2B241E]">
            Cidade Ancestral
          </h2>
          <p className="text-xs text-stone-700 font-medium leading-relaxed pt-1">
            Você alcançou o nível máximo desta versão de teste.
          </p>
          <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
            Você pode continuar administrando a vila, mas novos níveis ainda não estão disponíveis.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              audio.playWood();
              onContinue();
            }}
            className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-xs rounded-xl border-2 border-[#33261D] shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Check size={16} />
            <span>Continuar jogando</span>
          </button>
        </div>
      </div>
    </div>
  );
};
