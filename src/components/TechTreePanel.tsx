import React from 'react';
import { GameState, Technology } from '../types/game';
import { BookOpen, Check, Lock, Sparkles, ChevronRight, Award } from 'lucide-react';
import { ERAS_INFO } from '../data/initialData';
import { audio } from '../utils/audio';

interface TechTreePanelProps {
  gameState: GameState;
  onResearchTech: (techId: string) => void;
}

export const TechTreePanel: React.FC<TechTreePanelProps> = ({
  gameState,
  onResearchTech,
}) => {
  const { technologies, resources, currentEra } = gameState;
  const techList = Object.values(technologies);

  const canResearch = (tech: Technology) => {
    if (tech.unlocked) return false;
    if (resources.knowledge < tech.cost) return false;
    const prereqsMet = tech.prerequisites.every((prereqId) => technologies[prereqId]?.unlocked);
    if (!prereqsMet) return false;
    return true;
  };

  const isPrereqsMet = (tech: Technology) => {
    return tech.prerequisites.every((prereqId) => technologies[prereqId]?.unlocked);
  };

  const eraGroups = [1, 2, 3, 4].map((eraNum) => ({
    eraInfo: ERAS_INFO[eraNum],
    techs: techList.filter((t) => t.era === eraNum),
    isCurrentOrPast: eraNum <= currentEra,
  }));

  return (
    <div className="bg-[#FFFDF9] border-3 border-[#33261D] rounded-2xl p-3 sm:p-4 shadow-md flex flex-col gap-4">
      {/* Header with Knowledge Stock */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b-2 border-[#33261D]/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E5B84B] border-2 border-[#33261D] flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="text-[#33261D]" size={18} />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-[#2B241E] leading-tight">
              Árvore de Pesquisa Tecnológica
            </h3>
            <p className="text-[11px] font-hand font-bold text-stone-600">
              Desbloqueie avanços para elevar a vila à próxima Era
            </p>
          </div>
        </div>

        <div className="bg-[#FFFDF9] border-2 border-[#33261D] px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs">📜</span>
          <span className="text-[11px] font-bold text-stone-600">Conhecimento:</span>
          <span className="font-display font-extrabold text-sm text-purple-900">
            {Math.floor(resources.knowledge)} pts
          </span>
        </div>
      </div>

      {/* Eras & Technologies List */}
      <div className="space-y-4">
        {eraGroups.map(({ eraInfo, techs, isCurrentOrPast }) => {
          const unlockedInThisEra = techs.filter((t) => t.unlocked).length;
          const allUnlockedInEra = unlockedInThisEra === techs.length;

          return (
            <div
              key={eraInfo.id}
              className={`border-2 rounded-xl p-3 transition-all ${
                isCurrentOrPast
                  ? 'bg-[#FAF3E7] border-[#33261D]'
                  : 'bg-stone-200/50 border-stone-300 opacity-60'
              }`}
            >
              {/* Era Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-b border-stone-300 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-sm text-[#78350F]">
                    {eraInfo.name}
                  </span>
                  <span className="text-[10px] font-bold font-hand text-stone-600">
                    ({eraInfo.subtitle})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="text-stone-600">
                    {unlockedInThisEra}/{techs.length} desbloqueadas
                  </span>
                  {allUnlockedInEra && (
                    <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full text-[10px]">
                      <Award size={10} /> Dominada
                    </span>
                  )}
                </div>
              </div>

              {/* Tech Cards in Era */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {techs.map((tech) => {
                  const affordable = canResearch(tech);
                  const prereqsMet = isPrereqsMet(tech);

                  return (
                    <div
                      key={tech.id}
                      className={`border-2 rounded-xl p-2.5 flex flex-col justify-between transition-all ${
                        tech.unlocked
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                          : affordable
                          ? 'bg-[#FFFBF5] border-amber-500 shadow-xs ring-1 ring-amber-300'
                          : prereqsMet
                          ? 'bg-[#FFFDF9] border-[#33261D]/40'
                          : 'bg-stone-100 border-stone-300 opacity-70'
                      }`}
                    >
                      <div>
                        {/* Title & Status */}
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{tech.icon}</span>
                            <h4 className="font-display font-black text-xs text-stone-900 leading-tight">
                              {tech.name}
                            </h4>
                          </div>

                          {tech.unlocked && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Check size={12} />
                            </span>
                          )}
                          {!tech.unlocked && !prereqsMet && (
                            <span className="w-5 h-5 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center shrink-0">
                              <Lock size={10} />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-600 leading-snug mb-1.5 font-normal">
                          {tech.description}
                        </p>

                        <div className="bg-[#F8EFE2] rounded-md p-1 border border-[#33261D]/15 mb-2">
                          <p className="text-[10px] font-bold text-amber-900 flex items-start gap-1">
                            <Sparkles size={10} className="text-amber-600 shrink-0 mt-0.5" />
                            <span>{tech.effectDescription}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action / Cost */}
                      <div className="border-t border-stone-200 pt-1.5 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-mono font-bold text-stone-700 flex items-center gap-1">
                          📜 {tech.cost} pts
                        </span>

                        {!tech.unlocked && (
                          <button
                            onClick={() => {
                              audio.playTech();
                              onResearchTech(tech.id);
                            }}
                            disabled={!affordable}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
                              affordable
                                ? 'bg-[#E5B84B] border-[#33261D] text-[#2C241E] hover:bg-[#D9A036] cursor-pointer shadow-xs active:scale-95'
                                : 'bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <span>Descobrir</span>
                            <ChevronRight size={12} />
                          </button>
                        )}

                        {tech.unlocked && (
                          <span className="text-[10px] font-bold text-emerald-700 italic">
                            ✓ Descoberta
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
