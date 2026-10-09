import React, { useState } from 'react';
import { Building } from '../types/game';
import { Move, Trash2, X, AlertTriangle, Sparkles } from 'lucide-react';
import { audio } from '../utils/audio';

export interface BuildingInteractionPanelProps {
  buildingId: string;
  building: Building | null;
  facilityName: string;
  facilityIcon: string;
  facilityDescription: string;
  canDemolish: boolean;
  demolishReason?: string;
  onMove?: () => void;
  onDemolish: () => void;
  onClose: () => void;
}

export const BuildingInteractionPanel: React.FC<BuildingInteractionPanelProps> = ({
  buildingId: _buildingId,
  building,
  facilityName,
  facilityIcon,
  facilityDescription,
  canDemolish,
  demolishReason,
  onMove,
  onDemolish,
  onClose,
}) => {
  const [showConfirmDemolish, setShowConfirmDemolish] = useState(false);

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
        /* Action Buttons */
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              audio.playWood();
              onMove?.();
            }}
            className="w-full py-2 px-3 rounded-xl border-2 border-[#33261D] bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Mover esta estrutura no terreno"
          >
            <Move size={14} />
            <span>Mover Estrutura</span>
          </button>

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
              ✨ <strong>Dica de Reposicionamento:</strong> Clique e segure sobre a estrutura no mapa 3D para liberar o modo de mover.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
