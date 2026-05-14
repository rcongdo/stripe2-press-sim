// src/components/press/PressOverview.tsx
import { useState } from "react";
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { PRESS_EDUCATION } from "./pressEducation";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  onStationClick: (id: ChannelId) => void;
};

const SVG_W = 800;
const SVG_H = 450;
const DRUM_CX = 400;
const DRUM_CY = 170;
const DRUM_R = 140;
const PLATE_R = 22;
const ANILOX_R = 16;
// Distance from drum center to plate cylinder center
const STATION_DIST = DRUM_R + PLATE_R + 6;
// Distance from drum center to anilox center
const ANILOX_DIST = STATION_DIST + PLATE_R + ANILOX_R + 4;

const UNWIND_X = 75;
const UNWIND_Y = 375;
const REWIND_X = 725;
const REWIND_Y = 375;

// Dryer: fixed position near rewind side
const DRYER_X = 650;
const DRYER_Y = 290;
const DRYER_W = 46;
const DRYER_H = 28;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// Station arc: 135° (entry/left) to 45° (exit/right), stations go left→right
function stationAngleDeg(index: number, total: number): number {
  if (total === 1) return 90;
  return 135 - (index / (total - 1)) * 90;
}

function stationPos(deg: number, dist: number) {
  return {
    x: DRUM_CX + dist * Math.cos(toRad(deg)),
    y: DRUM_CY + dist * Math.sin(toRad(deg)),
  };
}

function stationHealthColor(density: number, target: number): string {
  const ratio = Math.abs(density - target) / target;
  if (ratio <= 0.1) return "#22a559";
  if (ratio <= 0.25) return "#e08c00";
  return "#d63b3b";
}

// Web tension: low=0, high=1; affects sag on approach/exit paths
function tensionNorm(webTension: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (webTension - min) / (max - min);
}

// Registration arrow: returns (dx, dy) from station center scaled for display
function regArrow(reg: { x: number; y: number } | undefined): { dx: number; dy: number; show: boolean } {
  if (!reg) return { dx: 0, dy: 0, show: false };
  const show = Math.abs(reg.x) > 0.5 || Math.abs(reg.y) > 0.5;
  return { dx: reg.x * 3, dy: reg.y * 3, show };
}

// Dryer color based on drying risk %
function dryerColor(dryingRisk: number): string {
  if (dryingRisk < 40) return "#7ec8d3";
  if (dryingRisk < 70) return "#e08c00";
  return "#d63b3b";
}

type TooltipState = { key: string; x: number; y: number } | null;

export function PressOverview({ job, settings, outcome, mode, selectedChannelId, onStationClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
  const tn = tensionNorm(
    settings.webTension,
    job.ranges.webTension.min,
    job.ranges.webTension.max,
  );

  // Entry/exit points on drum circumference
  const entryX = DRUM_CX + DRUM_R * Math.cos(toRad(135));
  const entryY = DRUM_CY + DRUM_R * Math.sin(toRad(135));
  const exitX  = DRUM_CX + DRUM_R * Math.cos(toRad(45));
  const exitY  = DRUM_CY + DRUM_R * Math.sin(toRad(45));

  // Sag control: high tension = no sag, low tension = 30px sag
  const sag = (1 - tn) * 30;
  const leftMidX = (UNWIND_X + entryX) / 2;
  const leftMidY = (UNWIND_Y + entryY) / 2 + sag;
  const rightMidX = (exitX + REWIND_X) / 2;
  const rightMidY = (exitY + REWIND_Y) / 2 + sag;

  function handleLabelClick(key: string, x: number, y: number) {
    if (mode !== "learn") return;
    setTooltip(prev => prev?.key === key ? null : { key, x, y });
  }

  return (
    <div className="press-overview" data-testid="press-overview" style={{ position: "relative" }}>
      {/* Learn mode tooltip */}
      {tooltip && PRESS_EDUCATION[tooltip.key] && (
        <div
          className="learn-tooltip"
          style={{ position: "static", marginBottom: 8, pointerEvents: "auto", cursor: "pointer" }}
          onClick={() => setTooltip(null)}
        >
          <div className="learn-tooltip__name">{PRESS_EDUCATION[tooltip.key].name}</div>
          {PRESS_EDUCATION[tooltip.key].description}
        </div>
      )}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
        {/* Web: approach from unwind */}
        <path
          d={`M ${UNWIND_X} ${UNWIND_Y} Q ${leftMidX} ${leftMidY} ${entryX} ${entryY}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />
        {/* Web: arc around drum (counterclockwise from 135° to 45° through 90°) */}
        <path
          d={`M ${entryX} ${entryY} A ${DRUM_R} ${DRUM_R} 0 0 0 ${exitX} ${exitY}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />
        {/* Web: exit to rewind */}
        <path
          d={`M ${exitX} ${exitY} Q ${rightMidX} ${rightMidY} ${REWIND_X} ${REWIND_Y}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />

        {/* CI Drum */}
        <circle cx={DRUM_CX} cy={DRUM_CY} r={DRUM_R} fill="#e8edf1" stroke="#697784" strokeWidth="2" />
        <text x={DRUM_CX} y={DRUM_CY + 6} textAnchor="middle" fontSize="11" fill="#697784" fontWeight="600">
          CI Drum
        </text>
        {mode === "learn" && (
          <text
            x={DRUM_CX} y={DRUM_CY - DRUM_R - 10}
            textAnchor="middle" fontSize="11" fill="#0f6b78" fontWeight="700"
            style={{ cursor: "pointer" }}
            onClick={e => handleLabelClick("ciDrum", DRUM_CX, DRUM_CY - DRUM_R - 30)}
          >
            Central Impression Drum
          </text>
        )}

        {/* Unwind stand */}
        <rect x={UNWIND_X - 14} y={UNWIND_Y - 24} width="28" height="28" rx="4"
          fill="#dde4ea" stroke="#697784" strokeWidth="1.5" />
        <circle cx={UNWIND_X} cy={UNWIND_Y - 10} r="10" fill="#b0bec5" stroke="#697784" strokeWidth="1" />
        <text x={UNWIND_X} y={UNWIND_Y + 18} textAnchor="middle" fontSize="10" fill="#697784">
          Unwind
        </text>

        {/* Rewind stand */}
        <rect x={REWIND_X - 14} y={REWIND_Y - 24} width="28" height="28" rx="4"
          fill="#dde4ea" stroke="#697784" strokeWidth="1.5" />
        <circle cx={REWIND_X} cy={REWIND_Y - 10} r="10" fill="#b0bec5" stroke="#697784" strokeWidth="1" />
        <text x={REWIND_X} y={REWIND_Y + 18} textAnchor="middle" fontSize="10" fill="#697784">
          Rewind
        </text>

        {/* Dryer unit */}
        <rect
          x={DRYER_X - DRYER_W / 2} y={DRYER_Y - DRYER_H / 2}
          width={DRYER_W} height={DRYER_H} rx="4"
          fill={dryerColor(outcome.dryingRisk)} stroke="#697784" strokeWidth="1.5"
        />
        <text x={DRYER_X} y={DRYER_Y + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="600">
          DRYER
        </text>
        <text x={DRYER_X} y={DRYER_Y + DRYER_H / 2 + 14} textAnchor="middle" fontSize="9" fill="#697784">
          {outcome.dryingRisk}%
        </text>

        {/* Print stations */}
        {activeChannels.map((ch, i) => {
          const deg = stationAngleDeg(i, activeChannels.length);
          const plate = stationPos(deg, STATION_DIST);
          const anilox = stationPos(deg, ANILOX_DIST);
          const density = outcome.channelDensity[ch.id] ?? 0;
          const healthColor = stationHealthColor(density, ch.targetDensity);
          const reg = regArrow(settings.registration[ch.id]);
          const isSelected = ch.id === selectedChannelId;

          return (
            <g
              key={ch.id}
              className="press-station"
              data-testid={`station-${ch.id}`}
              data-selected={isSelected}
              onClick={() => onStationClick(ch.id)}
              role="button"
              aria-label={ch.name}
            >
              {/* Health ring */}
              <circle
                className="station-ring"
                cx={plate.x} cy={plate.y} r={PLATE_R + 6}
                fill="none"
                stroke={isSelected ? "#0f6b78" : healthColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {/* Plate cylinder */}
              <circle cx={plate.x} cy={plate.y} r={PLATE_R}
                fill={ch.displayColor + "44"} stroke={ch.displayColor} strokeWidth="1.5" />
              {/* Anilox roll */}
              <circle cx={anilox.x} cy={anilox.y} r={ANILOX_R}
                fill="#dde4ea" stroke="#697784" strokeWidth="1" />
              {/* Channel label */}
              <text x={plate.x} y={plate.y + 4} textAnchor="middle" fontSize="10"
                fill={ch.displayColor} fontWeight="800">
                {ch.id.length === 1 ? ch.id : ch.id.slice(0, 2).toUpperCase()}
              </text>
              {/* Registration arrow */}
              {reg.show && (
                <line
                  x1={plate.x} y1={plate.y}
                  x2={plate.x + reg.dx} y2={plate.y + reg.dy}
                  stroke="#d63b3b" strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )}
              {/* Learn mode label */}
              {mode === "learn" && (
                <text
                  x={anilox.x} y={anilox.y - ANILOX_R - 6}
                  textAnchor="middle" fontSize="9" fill="#0f6b78" fontWeight="700"
                  onClick={e => { e.stopPropagation(); handleLabelClick("aniloxRoll", anilox.x, anilox.y - ANILOX_R - 20); }}
                >
                  Anilox Roll
                </text>
              )}
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#d63b3b" />
          </marker>
        </defs>
      </svg>

    </div>
  );
}
