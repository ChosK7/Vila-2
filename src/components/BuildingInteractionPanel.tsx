import React, { useState } from 'react';
import { Building, FarmState } from '../types/game';
import { audio } from '../utils/audio';
import { X, Sparkles, AlertTriangle, Move, Trash2 } from 'lucide-react';

export interface BuildingInteractionPanelProps {
  buildingId: string;
  building: Building | null;
  facilityName: string;
  facilityIcon: string;
  facilityDescription: string;
  canDemolish: boolean;
  demolishReason?: string;
  farmState?: FarmState;
  onTend?: () => void;
  onHarvest?: () => void;
  onMove?: () => void;
  onRotate?: () => void;
  onDemolish: () => void;
  onClose: () => void;
}

export const BuildingInteractionPanel: React.FC<BuildingInteractionPanelProps> = ({
  buildingId,
  building,
  facilityName,
  facilityIcon,
  facilityDescription,
  canDemolish,
  demolishReason,
  farmState,
  onTend,
  onHarvest,
  onMove,
  onRotate,
  onDemolish,
  onClose,
}) => {
  const [showConfirmDemolish, setShowConfirmDemolish] = useState(false);

  const isFoodStructure = buildingId === 'cooking_pit' || buildingId === 'wheat' || buildingId === 'granary';

  return (
    <div className="absolute top-[6.2rem] left-2.5 sm:left-4 z-20 bg-[#FDFBF7]/95 backdrop-blur-md border-3 border-[#33261D] rounded-2xl p-3.5 shadow-2xl w-80 max-w-[calc(100%-1.5rem)] animate-in fade-in slide-in-from-top-2 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-200 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{facilityIcon}</span>
          <div>
            <h3 className="font-hand font-extrabold text-base text-stone-900 leading-tight">
              {facilityName}
            </h3>
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              {building?.count ? `${building.count} Construído(s)` : 'Instalação da Vila'}
              {building?.level ? ` · Nível ${building.level}` : ''}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playWood();
            onClose();
          }}
          className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
          title="Fechar painel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Description & Benefits */}
      <p className="text-xs text-stone-700 leading-relaxed mb-2.5">
        {building?.description || facilityDescription}
      </p>

      {building?.benefitsDescription && (
        <div className="bg-[#F8EFE2] rounded-xl p-2 border border-[#33261D]/15 mb-3">
          <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600 shrink-0" />
            <span>{building.benefitsDescription}</span>
          </div>
        </div>
      )}

      {/* Farm Crops & Orchard Interface (Inspirada na fazenda viva com Couves, Trigo, Cenouras e Pomar) */}
      {isFoodStructure && (
        <div className="bg-[#FFFBF5] border-2 border-emerald-800/30 rounded-2xl p-2.5 mb-3 shadow-inner space-y-2">
          {/* Status Header & Auto-plant Badge */}
          <div className="flex items-center justify-between text-xs border-b border-amber-900/15 pb-1.5">
            <span className="font-black text-emerald-950 flex items-center gap-1">
              🌾 Fazenda & Pomar
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400">
              🌱 Plantio Automático Ativo
            </span>
          </div>

          {/* Crops Showcase (Interface da imagem: Couves, Trigo, Cenouras, Pomar Frutífero) */}
          <div className="grid grid-cols-4 gap-1 py-1">
            <div className="flex flex-col items-center bg-emerald-50/80 border border-emerald-300 rounded-xl p-1 text-center">
              <span className="text-base">🥬</span>
              <span className="text-[9px] font-extrabold text-emerald-950 leading-tight">Couves</span>
              <span className="text-[8px] text-emerald-700 font-mono">Fértil</span>
            </div>
            <div className="flex flex-col items-center bg-amber-50/80 border border-amber-300 rounded-xl p-1 text-center">
              <span className="text-base">🌾</span>
              <span className="text-[9px] font-extrabold text-amber-950 leading-tight">Trigo</span>
              <span className="text-[8px] text-amber-700 font-mono">Espigas</span>
            </div>
            <div className="flex flex-col items-center bg-orange-50/80 border border-orange-300 rounded-xl p-1 text-center">
              <span className="text-base">🥕</span>
              <span className="text-[9px] font-extrabold text-orange-950 leading-tight">Cenouras</span>
              <span className="text-[8px] text-orange-700 font-mono">Raízes</span>
            </div>
            <div className="flex flex-col items-center bg-rose-50/80 border border-rose-300 rounded-xl p-1 text-center">
              <span className="text-base">🍎</span>
              <span className="text-[9px] font-extrabold text-rose-950 leading-tight">Pomar</span>
              <span className="text-[8px] text-rose-700 font-mono">Frutas</span>
            </div>
          </div>

          {/* Maturation & Growth Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-extrabold text-stone-700">
              <span>Maturação da Safra</span>
              <span className="text-emerald-800">
                {farmState?.stage === 'ready' || (farmState?.growthProgress || 0) >= 95
                  ? '100% (Pronto!)'
                  : `${Math.round(farmState?.growthProgress || 20)}%`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
              <div
                className={`h-full transition-all duration-300 ${
                  farmState?.stage === 'ready' || (farmState?.growthProgress || 0) >= 95
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${farmState?.stage === 'ready' ? 100 : farmState?.growthProgress || 25}%` }}
              />
            </div>
          </div>

          {/* Interactive Actions (Cuidar & Colher; o plantio é 100% automático) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* 1. Cuidar da Plantação */}
            <button
              onClick={() => {
                audio.playWood();
                onTend?.();
              }}
              className="py-2 px-2 rounded-xl border border-sky-700 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
              title="Cuidar dos canteiros: irrigar campos e adubar a terra (+15 XP)"
            >
              <span>💧</span>
              <span>Cuidar da Safra</span>
            </button>

            {/* 2. Colheita */}
            <button
              onClick={() => {
                audio.playFanfare();
                onHarvest?.();
              }}
              className={`py-2 px-2 rounded-xl border font-black text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer ${
                farmState?.stage === 'ready' || (farmState?.growthProgress || 0) >= 95
                  ? 'border-amber-600 bg-amber-400 hover:bg-amber-500 text-stone-950 animate-bounce ring-2 ring-amber-500'
                  : 'border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 active:scale-95'
              }`}
              title="Colher legumes, cereais e frutas maduras para o celeiro (+25 XP)"
            >
              <span>🌾</span>
              <span>Colheita</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation State for Demolition */}
      {showConfirmDemolish ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-2.5 mb-1 animate-in fade-in">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-red-900 leading-tight">
              <strong className="block mb-0.5">Demolir {facilityName}?</strong>
              Os trabalhadores associados voltarão a entregar seus recursos na <strong>Sede da Vila</strong>.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowConfirmDemolish(false)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                audio.playStone();
                onDemolish();
                setShowConfirmDemolish(false);
              }}
              className="px-3 py-1 text-xs font-black rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons: Girar 90°, Mover e Demolir */
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Opção de Girar Construção (90° em cada clique) */}
            <button
              onClick={() => {
                audio.playWood();
                onRotate?.();
              }}
              className="py-2 px-2.5 rounded-xl border-2 border-[#33261D] bg-[#FFFBF5] hover:bg-[#EFE4CE] text-stone-900 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Girar esta construção em 90 graus"
            >
              <span className="text-sm">⟳</span>
              <span>Girar 90°</span>
            </button>

            {/* Mover Construção */}
            <button
              onClick={() => {
                audio.playWood();
                onMove?.();
              }}
              className="py-2 px-2.5 rounded-xl border-2 border-[#33261D] bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Mover esta estrutura no terreno"
            >
              <Move size={14} />
              <span>Mover</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (canDemolish) {
                audio.playWood();
                setShowConfirmDemolish(true);
              }
            }}
            disabled={!canDemolish}
            className={`w-full py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              canDemolish
                ? 'border-red-300 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer shadow-xs'
                : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
            title={demolishReason || 'Demolir esta estrutura'}
          >
            <Trash2 size={14} />
            <span>Destruir Construção</span>
          </button>

          {!canDemolish && demolishReason && (
            <p className="text-[10px] text-amber-900 font-bold text-center leading-tight">
              ⚠️ {demolishReason}
            </p>
          )}

          <div className="bg-[#F4EFE6] border border-[#33261D]/15 rounded-xl px-2.5 py-1.5 text-center mt-1">
            <p className="text-[11px] text-stone-700 font-medium">
              ✨ <strong>Dica de Reposicionamento:</strong> Clique e segure sobre a estrutura no mapa 3D para liberar o modo de mover e girar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
