import { useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
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
const SVG_H       = 420;
const WEB_Y       = 300;   // web runs near bottom; ink components extend upward
const PITCH       = 90;
const FIRST_X     = 70;
const MAX_SLOTS   = 10;

const PLATE_R     = 18;
const IMP_R       = 18;
const NIP_HALF    = 20;  // distance from station cx to each cylinder center
const ANILOX_R    = 14;
const FOUNTAIN_R  = 12;

// Dryer icons sit below the web between stations
const ICON_Y      = WEB_Y + 50;

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
  t: ReturnType<typeof useLocale>["t"];
  onClick: () => void;
  onHover?: (key: string | null) => void;
};

function StationColumn({ cx, ch, outcome, selected, mode, t, onClick, onHover }: StationColumnProps) {
  const isActive = ch !== null;
  const color = isActive ? ch!.displayColor : "#444";
  const ringColor = isActive
    ? healthColor(outcome.channelDensity[ch!.id] ?? 0, ch!.targetDensity)
    : "#555";

  const plateCx  = cx - NIP_HALF;
  const impCx    = cx + NIP_HALF;
  // Components rise above the web: anilox above plate, fountain above anilox
  const aniloxCy = WEB_Y - PLATE_R - ANILOX_R;
  const fontCy   = WEB_Y - PLATE_R - ANILOX_R * 2 - FOUNTAIN_R;

  // Ink tray: fountain top half submerged; tray sits above fountain center
  const panBot   = fontCy;
  const panTop   = fontCy - FOUNTAIN_R - 10;
  const panLeft  = plateCx - FOUNTAIN_R - 8;
  const panRight = plateCx + FOUNTAIN_R + 8;

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
      <g
        onMouseEnter={mode === "learn" && isActive ? () => onHover?.("impressionCylinder") : undefined}
        onMouseLeave={mode === "learn" ? () => onHover?.(null) : undefined}
      >
        <circle cx={impCx} cy={WEB_Y} r={IMP_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />
      </g>

      {/* Plate cylinder */}
      <g
        onMouseEnter={mode === "learn" && isActive ? () => onHover?.("plateCylinder") : undefined}
        onMouseLeave={mode === "learn" ? () => onHover?.(null) : undefined}
      >
        <circle cx={plateCx} cy={WEB_Y} r={PLATE_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />
      </g>

      {/* Anilox roll + doctor blade */}
      <g
        onMouseEnter={mode === "learn" && isActive ? () => onHover?.("aniloxRoll") : undefined}
        onMouseLeave={mode === "learn" ? () => onHover?.(null) : undefined}
      >
        <circle cx={plateCx} cy={aniloxCy} r={ANILOX_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#666" strokeWidth="1" />
        <line
          x1={plateCx + ANILOX_R * 0.6} y1={aniloxCy + ANILOX_R * 0.8}
          x2={plateCx + ANILOX_R + 11}   y2={aniloxCy + ANILOX_R * 2.2}
          stroke={isActive ? "#999" : "#555"} strokeWidth="1.5" strokeLinecap="round"
        />
      </g>

      {/* Fountain roll + ink tray */}
      <g
        onMouseEnter={mode === "learn" && isActive ? () => onHover?.("fountainRoll") : undefined}
        onMouseLeave={mode === "learn" ? () => onHover?.(null) : undefined}
      >
        <circle cx={plateCx} cy={fontCy} r={FOUNTAIN_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#555" strokeWidth="1" />

      {/* Ink tray */}
      <rect
        x={panLeft} y={panTop} width={panRight - panLeft} height={panBot - panTop}
        fill={isActive ? "#1e1e3e" : "#181828"} stroke="#555" strokeWidth="1"
      />
      {/* Ink fill inside tray — bottom portion (gravity) */}
      {isActive && (
        <rect
          x={panLeft + 1} y={panBot - (panBot - panTop) * 0.55}
          width={panRight - panLeft - 2} height={(panBot - panTop) * 0.55 - 1}
          fill={color} fillOpacity="0.3"
        />
      )}
      </g>

      {/* Channel label */}
      {isActive && (
        <text x={impCx} y={WEB_Y + 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">
          {ch!.id.length === 1 ? ch!.id : ch!.id.slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* Learn-mode labels — shown on hover via parent hover state */}
    </g>
  );
}

type DryerIconProps = { x: number; y: number; inkType: InkType; mode: PressMode; onLearnClick?: () => void; onLearnLeave?: () => void };

function DryerIcon({ x, y, inkType, mode, onLearnClick, onLearnLeave }: DryerIconProps) {
  const isUv = inkType === "uv";
  return (
    <g
      onMouseEnter={mode === "learn" ? onLearnClick : undefined}
      onMouseLeave={mode === "learn" ? onLearnLeave : undefined}
      style={mode === "learn" ? { cursor: "help" } : undefined}
    >
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
    </g>
  );
}

export function InlineOverview({ job, settings, outcome, mode, selectedChannelId, inkType, onStationClick }: Props) {
  const [learnHover, setLearnHover] = useState<string | null>(null);
  const { t } = useLocale();
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

  // Straight horizontal web path through all station nips
  const webPath = `M ${REEL_R + 8},${WEB_Y} L ${rewindX + REEL_R - 8},${WEB_Y}`;

  const tooltipKey = learnHover;
  const tooltipEdu = tooltipKey ? t.education[tooltipKey as keyof typeof t.education] : null;

  return (
    <div data-testid="press-overview" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ display: "block" }}
      >
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#1a1a2e" rx="8" />

        {/* Web path — straight horizontal */}
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
              t={t}
              onClick={() => ch && onStationClick(ch.id)}
              onHover={setLearnHover}
            />
          );
        })}

        {/* Inter-station dryer/UV icons */}
        {Array.from({ length: nStations - 1 }, (_, i) => {
          const midX = FIRST_X + i * PITCH + PITCH / 2;
          return (
            <DryerIcon key={i} x={midX} y={ICON_Y} inkType={inkType} mode={mode}
              onLearnClick={() => setLearnHover("interStationDryer")}
              onLearnLeave={() => setLearnHover(null)} />
          );
        })}

        {/* Rewind reel */}
        <circle cx={rewindX} cy={WEB_Y} r={REEL_R} fill="#2a2a4a" stroke="#666" strokeWidth="1.5" />
        <circle cx={rewindX} cy={WEB_Y} r={8} fill="#1a1a2e" />
        {mode === "learn" && (
          <text x={rewindX} y={WEB_Y + REEL_R + 14} textAnchor="middle" fill="#999" fontSize="8">Rewind</text>
        )}

      </svg>
      {mode === "learn" && tooltipEdu && (
        <div className="learn-tooltip" style={{ top: 8, left: 8 }}>
          <div className="learn-tooltip__name">{tooltipEdu.name}</div>
          {tooltipEdu.description}
        </div>
      )}
    </div>
  );
}
