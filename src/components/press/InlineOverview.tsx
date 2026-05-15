import { PRESS_EDUCATION } from "./pressEducation";
import type { ChannelId, InkType, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  inkType: InkType;
  onStationClick: (id: ChannelId) => void;
};

const SVG_W       = 980;
const SVG_H       = 400;
const WEB_Y       = 130;
const PITCH       = 90;
const FIRST_X     = 70;
const MAX_SLOTS   = 10;

const PLATE_R     = 18;
const IMP_R       = 18;
const NIP_HALF    = 20;  // distance from station cx to each cylinder center
const ANILOX_R    = 14;
const FOUNTAIN_R  = 12;

const DIP_Y       = WEB_Y + 50;  // bottom of the V-dip web path
const ICON_Y      = DIP_Y + 18;  // center of dryer/UV icon (below web)

const COL_W       = 40;  // ink pan top width
const REEL_R      = 22;

function healthColor(density: number, target: number): string {
  const err = Math.abs(density - target) / target;
  if (err < 0.10) return "#22a559";
  if (err < 0.25) return "#e08c00";
  return "#d63b3b";
}

type StationColumnProps = {
  cx: number;
  ch: { id: string; name: string; displayColor: string; targetDensity: number } | null;
  outcome: SimulationOutcome;
  selected: boolean;
  mode: PressMode;
  onClick: () => void;
};

function StationColumn({ cx, ch, outcome, selected, mode, onClick }: StationColumnProps) {
  const isActive = ch !== null;
  const color = isActive ? ch!.displayColor : "#444";
  const ringColor = isActive
    ? healthColor(outcome.channelDensity[ch!.id] ?? 0, ch!.targetDensity)
    : "#555";

  const plateCx  = cx - NIP_HALF;
  const impCx    = cx + NIP_HALF;
  const aniloxCy = WEB_Y + PLATE_R + ANILOX_R;
  const fontCy   = WEB_Y + PLATE_R + ANILOX_R * 2 + FOUNTAIN_R;

  // Ink pan trapezoid points
  const panTop    = fontCy + FOUNTAIN_R + 6;
  const panBot    = panTop + 28;
  const panHalfT  = COL_W / 2;
  const panHalfB  = panHalfT - 8;
  const panPts    = [
    `${plateCx - panHalfT},${panTop}`,
    `${plateCx + panHalfT},${panTop}`,
    `${plateCx + panHalfB},${panBot}`,
    `${plateCx - panHalfB},${panBot}`,
  ].join(" ");

  return (
    <g
      data-testid={isActive ? `station-${ch!.id}` : undefined}
      data-selected={selected ? "true" : undefined}
      onClick={isActive ? onClick : undefined}
      style={{ cursor: isActive ? "pointer" : "default" }}
    >
      {selected && (
        <circle cx={cx} cy={WEB_Y} r={IMP_R + NIP_HALF + 6} fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
      )}

      {/* Health ring around impression */}
      <circle cx={impCx} cy={WEB_Y} r={IMP_R + 4} fill="none" stroke={ringColor} strokeWidth="3" opacity={isActive ? 0.9 : 0.3} />

      {/* Impression cylinder */}
      <circle cx={impCx} cy={WEB_Y} r={IMP_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />

      {/* Plate cylinder */}
      <circle cx={plateCx} cy={WEB_Y} r={PLATE_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />

      {/* Anilox roll */}
      <circle cx={plateCx} cy={aniloxCy} r={ANILOX_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#666" strokeWidth="1" />

      {/* Fountain roll (partially in ink pan) */}
      <circle cx={plateCx} cy={fontCy} r={FOUNTAIN_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#555" strokeWidth="1" />

      {/* Ink pan */}
      <polygon points={panPts} fill={isActive ? "#1e1e3e" : "#181828"} stroke="#555" strokeWidth="1" />

      {/* Channel label */}
      {isActive && (
        <text x={impCx} y={WEB_Y + 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">
          {ch!.id.length === 1 ? ch!.id : ch!.id.slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* Learn-mode labels */}
      {mode === "learn" && isActive && (
        <>
          <text x={impCx + IMP_R + 4} y={WEB_Y - 2} fill="#ccc" fontSize="8">{PRESS_EDUCATION.impressionCylinder.name}</text>
          <text x={plateCx - PLATE_R - 4} y={WEB_Y - 2} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.plateCylinder.name}</text>
          <text x={plateCx - ANILOX_R - 4} y={aniloxCy + 3} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.aniloxRoll.name}</text>
          <text x={plateCx - FOUNTAIN_R - 4} y={fontCy + 3} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.fountainRoll.name}</text>
        </>
      )}
    </g>
  );
}

type DryerIconProps = { x: number; y: number; inkType: InkType; mode: PressMode };

function DryerIcon({ x, y, inkType, mode }: DryerIconProps) {
  const isUv = inkType === "uv";
  const label = isUv ? "UV" : "Dryer";
  return (
    <g>
      {isUv ? (
        <>
          <rect x={x - 10} y={y - 8} width={20} height={16} rx="2" fill="#2a2a1e" stroke="#c8a000" strokeWidth="1.5" />
          {[-6, -2, 2, 6].map(dx => (
            <line key={dx} x1={x + dx} y1={y - 8} x2={x + dx} y2={y - 14} stroke="#c8a000" strokeWidth="1" />
          ))}
        </>
      ) : (
        <>
          <rect x={x - 12} y={y - 8} width={24} height={16} rx="3" fill="#2a1a1a" stroke="#d06030" strokeWidth="1.5" />
          {[-4, 0, 4].map(dx => (
            <path key={dx} d={`M${x + dx},${y - 8} Q${x + dx + 3},${y - 12} ${x + dx},${y - 16} Q${x + dx - 3},${y - 20} ${x + dx},${y - 24}`}
              fill="none" stroke="#d06030" strokeWidth="1" opacity="0.7" />
          ))}
        </>
      )}
      {mode === "learn" && (
        <text x={x} y={y + 16} textAnchor="middle" fill="#999" fontSize="8">{label}</text>
      )}
    </g>
  );
}

export function InlineOverview({ job, settings, outcome, mode, selectedChannelId, inkType, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
  const nStations = Math.min(activeChannels.length, MAX_SLOTS);

  if (nStations === 0) {
    return (
      <svg data-testid="press-overview" viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: "block" }}>
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#1a1a2e" rx="8" />
        <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fill="#666" fontSize="14">No active stations</text>
      </svg>
    );
  }

  const rewindX = FIRST_X + nStations * PITCH;

  // Build web path: from unwind, through each station nip, V-dips between, to rewind
  let webPath = `M ${REEL_R + 8},${WEB_Y}`;
  for (let i = 0; i < nStations; i++) {
    const cx = FIRST_X + i * PITCH;
    webPath += ` L ${cx},${WEB_Y}`;
    if (i < nStations - 1) {
      const midX = cx + PITCH / 2;
      webPath += ` Q ${cx + PITCH * 0.25},${DIP_Y} ${midX},${DIP_Y}`;
      webPath += ` Q ${cx + PITCH * 0.75},${DIP_Y} ${cx + PITCH},${WEB_Y}`;
    }
  }
  webPath += ` L ${rewindX + REEL_R - 8},${WEB_Y}`;

  return (
    <svg
      data-testid="press-overview"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#1a1a2e" rx="8" />

      {/* Web path */}
      <path d={webPath} fill="none" stroke="#ccc" strokeWidth="3" opacity="0.7" />

      {/* Unwind reel */}
      <circle cx={REEL_R} cy={WEB_Y} r={REEL_R} fill="#2a2a4a" stroke="#666" strokeWidth="1.5" />
      <circle cx={REEL_R} cy={WEB_Y} r={8} fill="#1a1a2e" />
      {mode === "learn" && (
        <text x={REEL_R} y={WEB_Y + REEL_R + 14} textAnchor="middle" fill="#999" fontSize="8">Unwind</text>
      )}

      {/* Station columns */}
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const cx = FIRST_X + i * PITCH;
        const ch = i < nStations ? activeChannels[i] : null;
        return (
          <StationColumn
            key={i}
            cx={cx}
            ch={ch}
            outcome={outcome}
            selected={ch?.id === selectedChannelId}
            mode={mode}
            onClick={() => ch && onStationClick(ch.id)}
          />
        );
      })}

      {/* Inter-station dryer/UV icons */}
      {Array.from({ length: nStations - 1 }, (_, i) => {
        const midX = FIRST_X + i * PITCH + PITCH / 2;
        return (
          <DryerIcon key={i} x={midX} y={ICON_Y} inkType={inkType} mode={mode} />
        );
      })}

      {/* Rewind reel */}
      <circle cx={rewindX} cy={WEB_Y} r={REEL_R} fill="#2a2a4a" stroke="#666" strokeWidth="1.5" />
      <circle cx={rewindX} cy={WEB_Y} r={8} fill="#1a1a2e" />
      {mode === "learn" && (
        <text x={rewindX} y={WEB_Y + REEL_R + 14} textAnchor="middle" fill="#999" fontSize="8">Rewind</text>
      )}

      {/* Inline press learn label */}
      {mode === "learn" && (
        <text x={SVG_W / 2} y={SVG_H - 10} textAnchor="middle" fill="#888" fontSize="9">
          {PRESS_EDUCATION.inlinePress.name}
        </text>
      )}
    </svg>
  );
}
