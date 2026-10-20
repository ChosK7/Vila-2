import React, { useState } from 'react';
import { Sparkles, Compass, Play, ChevronRight, Crown } from 'lucide-react';
import { audio } from '../utils/audio';

interface IntroModalProps {
  isOpen: boolean;
  onStartGame: (chosenName: string) => void;
  defaultName?: string;
}

export const IntroModal: React.FC<IntroModalProps> = ({
  isOpen,
  onStartGame,
  defaultName = 'Líder Tribal',
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [leaderName, setLeaderName] = useState(defaultName);

  if (!isOpen) return null;

  const handleFinish = () => {
    audio.playFanfare();
    const finalName = leaderName.trim() || 'Líder Tribal';
    onStartGame(finalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#FAF3E7] border-4 border-[#33261D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Banner with Anime Illustration header */}
        <div className="relative bg-gradient-to-r from-sky-400 via-sky-300 to-amber-200 border-b-3 border-[#33261D] p-5 text-center overflow-hidden">
          <div className="absolute -right-6 -bottom-6 text-7xl opacity-20 pointer-events-none select-none">
            🌾
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#33261D] text-amber-300 text-xs font-black tracking-wider uppercase mb-2 shadow-sm">
            <Sparkles size={13} />
            <span>Bem-vindo à sua jornada</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#1e1b4b] tracking-wide">
            Vila Ancestral
          </h2>
          <p className="text-xs sm:text-sm font-hand font-bold text-stone-800 mt-1">
            Do primeiro trigo selvagem à civilização ancestral
          </p>
        </div>

        {/* Step Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {step === 1 ? (
            <div className="space-y-4 text-stone-800 font-hand text-sm leading-relaxed">
              <div className="bg-[#FFFDF9] border-2 border-[#33261D]/25 rounded-2xl p-4 shadow-xs space-y-2.5">
                <p className="text-base font-extrabold text-[#33261D] flex items-center gap-2">
                  <span>🌄</span> O Despertar do Povo
                </p>
                <p>
                  Dois corajosos aldeões chegam a este vale fértil sob o sol do amanhecer. Você foi escolhido para guiar os passos desta tribo através das eras.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#FFFDF9] border-2 border-[#33261D]/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <span className="text-2xl mb-1">🌾</span>
                  <strong className="text-xs text-stone-900 font-bold">Colha Alimentos</strong>
                  <span className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                    Trigo garante o sustento diário e permite acolher viajantes.
                  </span>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-[#33261D]/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <span className="text-2xl mb-1">🔨</span>
                  <strong className="text-xs text-stone-900 font-bold">Evolua Obras</strong>
                  <span className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                    Cabanas, poços e monumentos expandem seus domínios.
                  </span>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-[#33261D]/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <span className="text-2xl mb-1">✨</span>
                  <strong className="text-xs text-stone-900 font-bold">Cumpra Missões</strong>
                  <span className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                    Ganhe XP de liderança e desbloqueie novos ofícios.
                  </span>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-[#33261D]/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <span className="text-2xl mb-1">🧭</span>
                  <strong className="text-xs text-stone-900 font-bold">Expanda Fronteiras</strong>
                  <span className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                    Desbloqueie novas áreas construíveis e horizontes 3D.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-hand text-sm">
              <div className="bg-[#FFFDF9] border-2 border-[#33261D]/25 rounded-2xl p-4 shadow-xs text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-[#33261D] flex items-center justify-center text-2xl shadow-xs">
                  👑
                </div>
                <h4 className="font-extrabold text-base text-stone-900">
                  Como seu povo deve chamar você?
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Digite seu nome ou título ancestral. Ele aparecerá no trono da vila e nas crônicas de cada era.
                </p>

                <div className="pt-2">
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    maxLength={22}
                    placeholder="Ex: Líder Tribal, Raoni, Aya..."
                    className="w-full bg-white border-3 border-[#33261D] rounded-xl px-3.5 py-2 text-center text-base font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <Compass size={18} className="shrink-0 text-amber-700" />
                <span>
                  <strong>Dica:</strong> Cada dia dura 5 minutos em tempo real. Você pode pausar o ciclo celestial a qualquer momento tocando no sol/lua!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-[#EFE4CE] border-t-3 border-[#33261D] px-5 py-3.5 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <span className="text-xs font-hand text-stone-600">Passo 1 de 2</span>
              <button
                onClick={() => {
                  audio.playWood();
                  setStep(2);
                }}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-xs sm:text-sm rounded-xl border-2 border-[#33261D] shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Avançar</span>
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  audio.playWood();
                  setStep(1);
                }}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl border-2 border-[#33261D] transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-black text-xs sm:text-sm rounded-xl border-2 border-[#33261D] shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <Play size={15} fill="currentColor" />
                <span>Fundar Minha Vila</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
