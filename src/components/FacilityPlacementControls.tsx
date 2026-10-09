import React from 'react';
import { Move, RotateCcw, Check } from 'lucide-react';
import { AvailableFacilityItem, FacilityConfig } from '../three/FacilityPlacement';

export interface FacilityMoveToggleButtonProps {
  isMoveMode: boolean;
  onToggle: () => void;
}

export const FacilityMoveToggleButton: React.FC<FacilityMoveToggleButtonProps> = ({
  isMoveMode,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className={`px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-[#33261D] flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
        isMoveMode
          ? 'bg-amber-400 text-stone-950 ring-2 ring-stone-900 font-extrabold shadow-sm'
          : 'bg-[#FDFBF7]/95 hover:bg-[#EFE4CE] text-stone-700'
      }`}
      title="Reorganizar instalações e edifícios da vila no terreno"
    >
      <Move size={13} />
      <span className="hidden sm:inline">{isMoveMode ? 'Mover Ativo' : 'Mover'}</span>
      <span className="sm:hidden">{isMoveMode ? 'Ativo' : 'Mover'}</span>
    </button>
  );
};

export interface FacilityPlacementControlsProps {
  isMoveMode: boolean;
  onCloseMoveMode: () => void;
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
  availableFacilities: AvailableFacilityItem[];
  facilityPositions: Record<string, { x: number; z: number }>;
  facilityConfigs: Record<string, FacilityConfig>;
  moveToast: string | null;
  onResetPositions: () => void;
}

export const FacilityPlacementControls: React.FC<FacilityPlacementControlsProps> = ({
  isMoveMode,
  onCloseMoveMode,
  selectedFacilityId,
  onSelectFacility,
  availableFacilities,
  facilityPositions,
  facilityConfigs,
  moveToast,
  onResetPositions,
}) => {
  return (
    <>
      {/* Move Facility Floating Toolbar */}
      {isMoveMode && (
        <div className="absolute top-[6.2rem] left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl bg-[#FDFBF7]/95 backdrop-blur-md border-3 border-[#33261D] rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-top-3 pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-200 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏗️</span>
              <div>
                <h3 className="font-hand font-extrabold text-sm sm:text-base text-stone-900 leading-tight">
                  Reorganizar Instalações da Vila
                </h3>
                <p className="text-[11px] text-amber-900 font-bold">
                  {selectedFacilityId
                    ? `Selecionado: ${facilityConfigs[selectedFacilityId]?.name || selectedFacilityId}. Clique no solo 3D para reposicionar.`
                    : 'Selecione uma instalação abaixo ou clique no cenário 3D.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={onResetPositions}
                className="px-2 py-1 text-[11px] font-bold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Restaurar posições originais da aldeia"
              >
                <RotateCcw size={12} />
                <span>Padrão</span>
              </button>
              <button
                onClick={onCloseMoveMode}
                className="px-3 py-1 text-xs font-extrabold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} />
                <span>Concluir</span>
              </button>
            </div>
          </div>

          {/* Facility Chips Selection List */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {availableFacilities.map((fac) => {
              const isSelected = selectedFacilityId === fac.id;
              const currentPos = facilityPositions[fac.id];
              return (
                <button
                  key={fac.id}
                  onClick={() => onSelectFacility(fac.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 ring-2 ring-stone-900 shadow-xs font-extrabold scale-105'
                      : 'bg-stone-100 hover:bg-[#EFE4CE] text-stone-800 border border-stone-300/80'
                  }`}
                  title={`${fac.description}${currentPos ? ` (X: ${currentPos.x}, Z: ${currentPos.z})` : ''}`}
                >
                  <span>{fac.icon}</span>
                  <span>{fac.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between border-t border-stone-200/80 pt-1.5">
            <span className="italic">
              💡 Os aldeões atualizarão automaticamente suas rotas para o novo local!
            </span>
            {selectedFacilityId && facilityPositions[selectedFacilityId] && (
              <span className="font-mono text-[10px] text-stone-500 font-bold">
                X: {facilityPositions[selectedFacilityId].x} | Z: {facilityPositions[selectedFacilityId].z}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {moveToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-stone-900/90 text-amber-300 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg border border-amber-500/50 flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-2">
          <span>{moveToast}</span>
        </div>
      )}
    </>
  );
};
