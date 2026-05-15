import { useState } from "react";
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  onStationClick: (id: ChannelId, stationAngle: number) => void;
};

const SVG_W = 560;
const SVG_H = 560;
const DRUM_CX = 280;
const DRUM_CY = 290;
const DRUM_R = 150;
const PLATE_R = 22;
const ANILOX_R = 16;

// Circles are tangent: plate touches drum, anilox touches plate
const PLATE_DIST = DRUM_R + PLATE_R;                    // 172
const ANILOX_DIST = PLATE_DIST + PLATE_R + ANILOX_R;   // 210

// 10 fixed station slots. Gap at top (225°→315° through 270°).
// Right 5 (clockwise from top-right): 315, 345, 15, 45, 75
// Left 5 (continuing clockwise from bottom-left): 105, 135, 165, 195, 225
const STATION_ANGLES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225] as const;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function drumPoint(deg: number) {
  return {
    x: DRUM_CX + DRUM_R * Math.cos(toRad(deg)),
    y: DRUM_CY + DRUM_R * Math.sin(toRad(deg)),
  };
}

function healthColor(density: number, target: number): string {
  if (target === 0) return "#22a559";
  const ratio = Math.abs(density - target) / target;
  if (ratio <= 0.10) return "#22a559";
  if (ratio <= 0.25) return "#e08c00";
  return "#d63b3b";
}

function tensionNorm(t: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (t - min) / (max - min);
}

type TooltipState = { key: string } | null;

export function CIOverview({ job, settings, outcome, mode, selectedChannelId, onStationClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
  const { t } = useLocale();

  const tn = tensionNorm(settings.webTension, job.ranges.webTension.min, job.ranges.webTension.max);
  const sag = (1 - tn) * 12;

  // Web arc entry/exit on drum circumference
  const entry = drumPoint(315);
  const exit  = drumPoint(225);

  // Unwind/rewind positioned above the drum gap
  const UNWIND_X = DRUM_CX + 175;
  const UNWIND_Y = DRUM_CY - DRUM_R - 85;
  const REWIND_X = DRUM_CX - 175;
  const REWIND_Y = DRUM_CY - DRUM_R - 85;

  function handleLabel(key: string) {
    if (mode !== "learn") return;
    setTooltip(prev => prev?.key === key ? null : { key });
  }

  return (
    <div className="press-overview" data-testid="press-overview" style={{ position: "relative" }}>
      {tooltip && t.education[tooltip.key as keyof typeof t.education] && (
        <div
          className="learn-tooltip"
          style={{ position: "static", marginBottom: 8, pointerEvents: "auto", cursor: "pointer" }}
          onClick={() => setTooltip(null)}
        >
          <div className="learn-tooltip__name">{t.education[tooltip.key as keyof typeof t.education].name}</div>
          {t.education[tooltip.key as keyof typeof t.education].description}
        </div>
      )}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
        {/* Web arc on drum surface: clockwise from 315° to 225°, large arc (270°) */}
        <path
          d={`M ${entry.x.toFixed(1)} ${entry.y.toFixed(1)} A ${DRUM_R} ${DRUM_R} 0 1 1 ${exit.x.toFixed(1)} ${exit.y.toFixed(1)}`}
          fill="none" stroke="#b0bec5" strokeWidth="5"
        />

        {/* Web lines to unwind/rewind (dashed, above the drum) */}
        <line x1={entry.x} y1={entry.y} x2={UNWIND_X} y2={UNWIND_Y + sag}
          stroke="#b0bec5" strokeWidth="2.5" strokeDasharray="5,3" />
        <line x1={exit.x} y1={exit.y} x2={REWIND_X} y2={REWIND_Y + sag}
          stroke="#b0bec5" strokeWidth="2.5" strokeDasharray="5,3" />
        <text x={UNWIND_X + 5} y={UNWIND_Y - 4} textAnchor="start" fontSize="9" fill="#697784">Unwind</text>
        <text x={REWIND_X - 5} y={REWIND_Y - 4} textAnchor="end" fontSize="9" fill="#697784">Rewind</text>

        {/* CI Drum */}
        <circle cx={DRUM_CX} cy={DRUM_CY} r={DRUM_R} fill="#e8edf1" stroke="#697784" strokeWidth="2" />
        <text x={DRUM_CX} y={DRUM_CY + 5} textAnchor="middle" fontSize="12" fill="#697784" fontWeight="600">
          CI Drum
        </text>
        {mode === "learn" && (
          <text
            x={DRUM_CX} y={DRUM_CY - 18}
            textAnchor="middle" fontSize="10" fill="#0f6b78" fontWeight="700"
            style={{ cursor: "pointer" }}
            onClick={() => handleLabel("ciDrum")}
          >
            {t.education.ciDrum.name}
          </text>
        )}

        {/* 10 station slots — all rendered; active channels in color, unused in gray */}
        {(STATION_ANGLES as readonly number[]).map((deg, slotIndex) => {
          const ch = activeChannels[slotIndex];
          const active = ch !== undefined;
          const selected = active && ch.id === selectedChannelId;
          const density = active ? (outcome.channelDensity[ch.id] ?? 0) : 0;
          const hColor = active ? healthColor(density, ch.targetDensity) : "#ccc";
          const plateFill = active ? ch.displayColor + "44" : "#f0f0f2";
          const plateStroke = active ? ch.displayColor : "#bbb";
          const label = active
            ? (ch.id.length === 1 ? ch.id : ch.id.slice(0, 2).toUpperCase())
            : "";

          return (
            <g
              key={slotIndex}
              transform={`rotate(${deg}, ${DRUM_CX}, ${DRUM_CY})`}
              className={active ? "press-station" : undefined}
              data-testid={active ? `station-${ch.id}` : `station-slot-${slotIndex}`}
              data-selected={active ? selected : undefined}
              onClick={active ? () => onStationClick(ch.id, deg) : undefined}
              role={active ? "button" : undefined}
              aria-label={active ? ch.name : `Unused station ${slotIndex + 1}`}
            >
              {/* Health / selection ring (active only) */}
              {active && (
                <circle
                  className="station-ring"
                  cx={DRUM_CX + PLATE_DIST} cy={DRUM_CY}
                  r={PLATE_R + 5}
                  fill="none"
                  stroke={selected ? "#0f6b78" : hColor}
                  strokeWidth={selected ? 2.5 : 1.5}
                />
              )}
              {/* Plate cylinder — tangent to drum */}
              <circle
                cx={DRUM_CX + PLATE_DIST} cy={DRUM_CY}
                r={PLATE_R}
                fill={plateFill}
                stroke={plateStroke}
                strokeWidth="1.5"
              />
              {/* Anilox roll — tangent to plate */}
              <circle
                cx={DRUM_CX + ANILOX_DIST} cy={DRUM_CY}
                r={ANILOX_R}
                fill={active ? "#dde4ea" : "#f0f0f2"}
                stroke={active ? "#697784" : "#bbb"}
                strokeWidth="1"
              />
              {/* Ink chamber (small rect, outer side of anilox) */}
              <rect
                x={DRUM_CX + ANILOX_DIST + ANILOX_R + 3} y={DRUM_CY - 9}
                width={20} height={18} rx="2"
                fill={active ? ch.displayColor + "22" : "#f0f0f2"}
                stroke={active ? "#697784" : "#bbb"}
                strokeWidth="1"
              />
              {/* Channel label */}
              {active && label && (
                <text
                  x={DRUM_CX + PLATE_DIST} y={DRUM_CY + 4}
                  textAnchor="middle" fontSize="9"
                  fill={ch.displayColor} fontWeight="800"
                >
                  {label}
                </text>
              )}
              {/* Learn mode: anilox label */}
              {mode === "learn" && active && (
                <text
                  x={DRUM_CX + ANILOX_DIST} y={DRUM_CY - ANILOX_R - 5}
                  textAnchor="middle" fontSize="8" fill="#0f6b78" fontWeight="700"
                  onClick={e => { e.stopPropagation(); handleLabel("aniloxRoll"); }}
                >
                  {t.education.aniloxRoll.name}
                </text>
              )}
            </g>
          );
        })}

        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#d63b3b" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
