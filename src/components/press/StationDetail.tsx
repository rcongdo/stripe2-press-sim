// src/components/press/StationDetail.tsx
import { useEffect, useRef, useState } from "react";
import type { ChannelDef, JobPreset, PressSettings, PressType, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  channelId: string;
  stationAngle: number;
  stationNumber: number;
  stationCount: number;
  channelName: string;
  pressType?: PressType;
  onPrevStation: () => void;
  onNextStation: () => void;
  onBack: () => void;
};

const SD_W = 460;
const SD_H = 460;
const SD_SCALE = 2;

// Canvas center — we rotate the whole scene around this point
const CX = SD_W / 2;
const CY = SD_H / 2;

// Radii (touching circles)
const PLATE_R = 48;
const ANILOX_R = 36;
const CI_R = 130;

// Distances from plate center (0,0 in rotated space):
//   CI drum center is  PLATE_R + CI_R   to the LEFT  (negative x)
//   Anilox center is   PLATE_R + ANILOX_R to the RIGHT (positive x)
const CI_DIST   = PLATE_R + CI_R;    // 178
const ANILOX_DIST = PLATE_R + ANILOX_R; // 84

// Small ink chamber sits past the anilox
const CHAMBER_GAP = 4;
const CHAMBER_W  = 44;
const CHAMBER_HH = 16; // half-height of chamber

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  inkSettings: { aniloxVolume: number; viscosity: number; strength: number; impression: number } | undefined,
  stationAngle: number,
  aniloxAngle: number,
  dripT: number,
  mode: PressMode,
  dryingRisk: number,
  plateLabel: string,
) {
  const s = SD_SCALE;
  ctx.clearRect(0, 0, SD_W * s, SD_H * s);

  const impression   = inkSettings?.impression   ?? 54;
  const aniloxVolume = inkSettings?.aniloxVolume ?? 3.2;
  const viscosity    = inkSettings?.viscosity    ?? 28;
  const strength     = inkSettings?.strength     ?? 100;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, SD_W * s, SD_H * s);

  // ── Rotate entire scene so "right" aligns with the station's radial direction ──
  // Station angle 0° = right side of drum (3 o'clock). We rotate the canvas
  // so the station's outward direction faces the same way in screen space.
  ctx.save();
  ctx.translate(CX * s, CY * s);
  ctx.rotate((stationAngle * Math.PI) / 180);

  // In this coordinate system:
  //   plate center at (0, 0)
  //   CI drum center at (-CI_DIST, 0)  — to the left
  //   anilox center at (+ANILOX_DIST, 0) — to the right
  //   chamber beyond anilox

  // ── CI drum (large circle, left) ────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(-CI_DIST * s, 0, CI_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#2a2a4a";
  ctx.fill();
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // ── Plate cylinder ───────────────────────────────────────────────────────────
  if (impression > 80) {
    ctx.beginPath();
    ctx.arc(0, 0, (PLATE_R + 2) * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214,59,59,0.15)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, PLATE_R * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.3);
  ctx.fill();
  ctx.strokeStyle = ch.displayColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // Plate label — drawn un-rotated so text is always upright
  ctx.save();
  ctx.rotate(-(stationAngle * Math.PI) / 180);
  ctx.fillStyle = ch.displayColor;
  ctx.font = `bold ${10 * s}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(plateLabel, 0, 0);
  ctx.restore();

  // ── Anilox roll ──────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(ANILOX_DIST * s, 0, ANILOX_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#2e2e4e";
  ctx.fill();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Cell texture (dots, rotate with aniloxAngle)
  const cellAlpha = 0.3 + (aniloxVolume / 5.5) * 0.6;
  ctx.save();
  ctx.translate(ANILOX_DIST * s, 0);
  ctx.rotate((aniloxAngle * Math.PI) / 180);
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const cx2 = col * 9 * s;
      const cy2 = row * 9 * s;
      if (Math.sqrt(cx2 * cx2 + cy2 * cy2) < (ANILOX_R - 5) * s) {
        ctx.beginPath();
        ctx.arc(cx2, cy2, 2.2 * s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(ch.displayColor, cellAlpha);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Ink chamber (small rect to the right of anilox) ─────────────────────────
  const chamberX = (ANILOX_DIST + ANILOX_R + CHAMBER_GAP) * s;
  const chamberFill = 0.2 + (strength / 120) * 0.6;

  ctx.fillStyle = "rgba(20,20,50,0.95)";
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.roundRect(chamberX, -CHAMBER_HH * s, CHAMBER_W * s, CHAMBER_HH * 2 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  const fillW = CHAMBER_W * chamberFill;
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.55);
  ctx.beginPath();
  ctx.roundRect(
    chamberX,
    -CHAMBER_HH * s,
    fillW * s,
    CHAMBER_HH * 2 * s,
    [3 * s, 0, 0, 3 * s],
  );
  ctx.fill();

  // ── Ink drip (travels from chamber toward anilox surface) ───────────────────
  const dripRadius = Math.max(1.5, 4 - viscosity * 0.05);
  const dripStartX = chamberX;
  const dripEndX   = (ANILOX_DIST + ANILOX_R) * s;
  const dripX = dripStartX + (dripEndX - dripStartX) * dripT;
  ctx.beginPath();
  ctx.arc(dripX, 0, dripRadius * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.8);
  ctx.fill();

  // ── Doctor blade (trailing, anilox → lower) ──────────────────────────────────
  const doctorWarning = impression > 80 || viscosity > 38;
  ctx.strokeStyle = (doctorWarning && mode === "operate") ? "#e08c00" : "#888";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(chamberX, CHAMBER_HH * s);
  ctx.lineTo((ANILOX_DIST + ANILOX_R - 3) * s, ANILOX_R * 0.4 * s);
  ctx.stroke();

  // ── Containment blade (leading, anilox → upper) ──────────────────────────────
  const containmentWarning = mode === "operate" && dryingRisk > 65;
  ctx.strokeStyle = containmentWarning ? "#e08c00" : "#888";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(chamberX, -CHAMBER_HH * s);
  ctx.lineTo((ANILOX_DIST + ANILOX_R - 3) * s, -ANILOX_R * 0.4 * s);
  ctx.stroke();

  ctx.restore(); // end scene rotation
}

// Inline press station layout constants (canvas coords, scale=1 applied via SD_SCALE)
const INL_NIP_Y    = 340;   // web/nip level — near bottom
const INL_CX       = SD_W / 2;
const INL_PLATE_R  = 46;
const INL_IMP_R    = 46;
const INL_NIP_HALF = 50;    // px between station center and each cylinder center
const INL_ANILOX_R = 34;
const INL_FONT_R   = 26;

function drawInlineFrame(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  inkSettings: { aniloxVolume: number; viscosity: number; strength: number; impression: number } | undefined,
  aniloxAngle: number,
  dripT: number,
  mode: PressMode,
  dryingRisk: number,
  plateLabel: string,
) {
  const s = SD_SCALE;
  ctx.clearRect(0, 0, SD_W * s, SD_H * s);

  const impression   = inkSettings?.impression   ?? 54;
  const aniloxVolume = inkSettings?.aniloxVolume ?? 3.2;
  const viscosity    = inkSettings?.viscosity    ?? 28;
  const strength     = inkSettings?.strength     ?? 100;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, SD_W * s, SD_H * s);

  const plateCx  = INL_CX - INL_NIP_HALF;
  const impCx    = INL_CX + INL_NIP_HALF;
  const nipY     = INL_NIP_Y;
  const aniloxCy = nipY - INL_PLATE_R - INL_ANILOX_R;
  const fontCy   = nipY - INL_PLATE_R - INL_ANILOX_R * 2 - INL_FONT_R;

  // Ink tray
  const panH    = INL_FONT_R + 14;
  const panW    = INL_FONT_R * 2 + 20;
  const panLeft = plateCx - panW / 2;
  const panBot  = fontCy;
  const panTop  = fontCy - panH;

  // ── Impression cylinder ──────────────────────────────────────────────────────
  if (impression > 80) {
    ctx.beginPath();
    ctx.arc(impCx * s, nipY * s, (INL_IMP_R + 3) * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214,59,59,0.2)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(impCx * s, nipY * s, INL_IMP_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#3a3a5a";
  ctx.fill();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // ── Plate cylinder ───────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(plateCx * s, nipY * s, INL_PLATE_R * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.3);
  ctx.fill();
  ctx.strokeStyle = ch.displayColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // Plate label
  ctx.fillStyle = ch.displayColor;
  ctx.font = `bold ${10 * s}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(plateLabel, plateCx * s, nipY * s);

  // ── Anilox roll ──────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(plateCx * s, aniloxCy * s, INL_ANILOX_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#2e2e4e";
  ctx.fill();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Cell texture
  const cellAlpha = 0.3 + (aniloxVolume / 5.5) * 0.6;
  ctx.save();
  ctx.translate(plateCx * s, aniloxCy * s);
  ctx.rotate((aniloxAngle * Math.PI) / 180);
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const cx2 = col * 9 * s;
      const cy2 = row * 9 * s;
      if (Math.sqrt(cx2 * cx2 + cy2 * cy2) < (INL_ANILOX_R - 5) * s) {
        ctx.beginPath();
        ctx.arc(cx2, cy2, 2.2 * s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(ch.displayColor, cellAlpha);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Doctor blade (lower-right of anilox, angling toward plate) ──────────────
  const doctorWarning = impression > 80 || viscosity > 38;
  ctx.strokeStyle = (doctorWarning && mode === "operate") ? "#e08c00" : "#888";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo((plateCx + INL_ANILOX_R * 0.65) * s, (aniloxCy + INL_ANILOX_R * 0.75) * s);
  ctx.lineTo((plateCx + INL_ANILOX_R + 22) * s,   (aniloxCy + INL_ANILOX_R * 2.4) * s);
  ctx.stroke();

  // ── Fountain roll ────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(plateCx * s, fontCy * s, INL_FONT_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#2e2e4e";
  ctx.fill();
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // ── Ink tray ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#1e1e3e";
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.rect(panLeft * s, panTop * s, panW * s, panH * s);
  ctx.fill();
  ctx.stroke();

  // Ink fill (bottom portion)
  const fillH = panH * 0.55;
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.3);
  ctx.fillRect(
    (panLeft + 1) * s, (panBot - fillH) * s,
    (panW - 2) * s, (fillH - 1) * s,
  );

  // ── Ink drip (from tray toward anilox surface) ────────────────────────────
  const dripRadius = Math.max(2, 5 - viscosity * 0.06);
  const dripStartY = fontCy - INL_FONT_R;
  const dripEndY   = aniloxCy + INL_ANILOX_R;
  const dripY = dripStartY + (dripEndY - dripStartY) * dripT;
  ctx.beginPath();
  ctx.arc(plateCx * s, dripY * s, dripRadius * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.8);
  ctx.fill();

  // ── Web line (horizontal at nip level) ──────────────────────────────────────
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 4 * s;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, nipY * s);
  ctx.lineTo(SD_W * s, nipY * s);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Strength fill indicator in anilox (subtle shade variation)
  const chamberFill = 0.15 + (strength / 120) * 0.4;
  ctx.fillStyle = hexToRgba(ch.displayColor, chamberFill);
  ctx.beginPath();
  ctx.arc(plateCx * s, aniloxCy * s, (INL_ANILOX_R - 4) * s, 0, Math.PI * 2);
  ctx.fill();
}

type CalloutDef = {
  key: string;
  label: string;
  x: number;
  y: number;
};

const LEARN_LABELS_CI: { key: string; educationKey: string; x: number; y: number }[] = [
  { key: "inkChamber",       educationKey: "inkChamber",       x: 310, y: 180 },
  { key: "doctorBlade",      educationKey: "doctorBlade",      x: 310, y: 260 },
  { key: "containmentBlade", educationKey: "containmentBlade", x: 20,  y: 180 },
  { key: "aniloxRoll",       educationKey: "aniloxRoll",       x: 20,  y: 310 },
  { key: "plateCylinder",    educationKey: "plateCylinder",    x: 20,  y: 260 },
  { key: "ciDrum",           educationKey: "ciDrum",           x: 20,  y: 370 },
];

const LEARN_LABELS_INLINE: { key: string; educationKey: string; x: number; y: number }[] = [
  { key: "fountainRoll",      educationKey: "fountainRoll",      x: 280, y: 30  },
  { key: "aniloxRoll",        educationKey: "aniloxRoll",        x: 280, y: 120 },
  { key: "doctorBlade",       educationKey: "doctorBlade",       x: 280, y: 200 },
  { key: "plateCylinder",     educationKey: "plateCylinder",     x: 20,  y: 300 },
  { key: "impressionCylinder",educationKey: "impressionCylinder",x: 280, y: 300 },
];

export function StationDetail({ job, settings, outcome, mode, channelId, stationAngle, stationNumber, stationCount, channelName, pressType = "ci", onPrevStation, onNextStation, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const aniloxAngleRef = useRef(0);
  const dripTRef = useRef(0);
  const [learnHover, setLearnHover] = useState<string | null>(null);

  const ch = job.channels.find(c => c.id === channelId) ?? job.channels[0];
  const inkSettings = settings.inkChannels[channelId];
  const learnLabels = pressType === "inline" ? LEARN_LABELS_INLINE : LEARN_LABELS_CI;

  const { t } = useLocale();

  const operateCallouts = [
    { key: "anilox",     label: t.stationLabels.anilox,     x: 310, y: 180 },
    { key: "viscosity",  label: t.stationLabels.viscosity,  x: 20,  y: 180 },
    { key: "impression", label: t.stationLabels.impression, x: 20,  y: 260 },
    { key: "strength",   label: t.stationLabels.strength,   x: 310, y: 260 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viscosity = inkSettings?.viscosity ?? 28;
    const dripSpeed = 0.008 * (2.5 / (viscosity / 28));

    function tick() {
      dripTRef.current = (dripTRef.current + dripSpeed) % 1;
      aniloxAngleRef.current = (aniloxAngleRef.current + 0.6) % 360;
      if (pressType === "inline") {
        drawInlineFrame(
          ctx!,
          ch,
          inkSettings,
          aniloxAngleRef.current,
          dripTRef.current,
          mode,
          outcome.dryingRisk,
          t.stationLabels.plate,
        );
      } else {
        drawFrame(
          ctx!,
          ch,
          inkSettings,
          stationAngle,
          aniloxAngleRef.current,
          dripTRef.current,
          mode,
          outcome.dryingRisk,
          t.stationLabels.plate,
        );
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [ch, inkSettings, stationAngle, pressType, mode, outcome.dryingRisk, t]);

  return (
    <div className="station-detail" data-testid="station-detail" style={{ position: "relative" }}>
      <div className="station-detail__header">
        <button type="button" className="press-back-btn" onClick={onBack}>
          ← Back to press
        </button>
        <div className="station-nav">
          <button type="button" className="station-nav__btn" aria-label="Previous station" onClick={onPrevStation}>‹</button>
          <span className="station-nav__label">
            <span className="station-nav__number">Station {stationNumber}</span>
            <span className="station-nav__channel">{channelName}</span>
          </span>
          <button type="button" className="station-nav__btn" aria-label="Next station" onClick={onNextStation}>›</button>
        </div>
        <span className="station-nav__count">{stationNumber} / {stationCount}</span>
      </div>
      <div style={{ position: "relative", maxWidth: SD_W }}>
        <canvas
          ref={canvasRef}
          width={SD_W * SD_SCALE}
          height={SD_H * SD_SCALE}
          style={{ width: SD_W, height: SD_H }}
        />

        {mode === "operate" && operateCallouts.map(c => {
          let value = "";
          if (c.key === "anilox")     value = `${inkSettings?.aniloxVolume ?? "—"} BCM`;
          if (c.key === "viscosity")  value = `${inkSettings?.viscosity ?? "—"} s`;
          if (c.key === "impression") value = `${inkSettings?.impression ?? "—"}%`;
          if (c.key === "strength")   value = `${inkSettings?.strength ?? "—"}%`;
          return (
            <div
              key={c.key}
              data-testid={`callout-${c.key}`}
              className="station-callout"
              style={{ top: c.y, left: c.x }}
            >
              <span style={{ opacity: 0.7, fontSize: "0.65rem", display: "block" }}>{c.label}</span>
              {value}
            </div>
          );
        })}

        {mode === "learn" && learnLabels.map(l => {
          const edu = t.education[l.educationKey as keyof typeof t.education];
          const isHovered = learnHover === l.key;
          return (
            <div
              key={l.key}
              data-testid={`learn-label-${l.key}`}
              className={`station-callout station-callout--learn${isHovered ? " station-callout--learn-active" : ""}`}
              style={{ top: l.y, left: l.x }}
              onMouseEnter={() => setLearnHover(l.key)}
              onMouseLeave={() => setLearnHover(null)}
            >
              <span className="callout-name">{edu?.name ?? l.key}</span>
              {isHovered && edu?.description}
            </div>
          );
        })}
      </div>
    </div>
  );
}
