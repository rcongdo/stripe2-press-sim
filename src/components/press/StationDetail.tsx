// src/components/press/StationDetail.tsx
import { useEffect, useRef } from "react";
import type { ChannelDef, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { PRESS_EDUCATION } from "./pressEducation";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  channelId: string;
  onBack: () => void;
};

const SD_W = 540;
const SD_H = 430;
const SD_SCALE = 2;

const PLATE_CX = 270;
const PLATE_CY = 315;
const PLATE_R = 52;

const ANILOX_CX = 270;
const ANILOX_CY = 208;
const ANILOX_R = 44;

const CHAMBER_X = 148;
const CHAMBER_Y = 38;
const CHAMBER_W = 244;
const CHAMBER_H = 140;

const CI_CX = 270;
const CI_CY = 710;
const CI_R = 385;

function webY(impression: number): number {
  return PLATE_CY + PLATE_R + Math.max(0, Math.round(16 - impression * 0.16));
}

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
  aniloxAngle: number,
  dripY: number,
  mode: PressMode,
  dryingRisk: number,
) {
  const s = SD_SCALE;
  ctx.clearRect(0, 0, SD_W * s, SD_H * s);

  const impression = inkSettings?.impression ?? 54;
  const aniloxVolume = inkSettings?.aniloxVolume ?? 3.2;
  const viscosity = inkSettings?.viscosity ?? 28;
  const strength = inkSettings?.strength ?? 100;
  const wy = webY(impression);

  // Background
  ctx.fillStyle = "#f4f7f9";
  ctx.fillRect(0, 0, SD_W * s, SD_H * s);

  // ── CI drum arc ──────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(CI_CX * s, CI_CY * s, CI_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#dde4ea";
  ctx.fill();
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // ── Web ──────────────────────────────────────────────────
  ctx.fillStyle = "#b0bec5";
  ctx.fillRect(0, wy * s, SD_W * s, 10 * s);

  // ── Plate cylinder ───────────────────────────────────────
  // Plate squash: at very high impression, tint the contact area
  if (impression > 80) {
    ctx.beginPath();
    ctx.arc(PLATE_CX * s, PLATE_CY * s, (PLATE_R + 2) * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214,59,59,0.15)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(PLATE_CX * s, PLATE_CY * s, PLATE_R * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.2);
  ctx.fill();
  ctx.strokeStyle = ch.displayColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.fillStyle = ch.displayColor;
  ctx.font = `bold ${11 * s}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Plate", PLATE_CX * s, (PLATE_CY + 5) * s);

  // ── Anilox roll ──────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(ANILOX_CX * s, ANILOX_CY * s, ANILOX_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#e8edf1";
  ctx.fill();
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Cell texture: concentric dots suggesting engraving, rotated by aniloxAngle
  const cellAlpha = 0.3 + (aniloxVolume / 5.5) * 0.6;
  ctx.save();
  ctx.translate(ANILOX_CX * s, ANILOX_CY * s);
  ctx.rotate((aniloxAngle * Math.PI) / 180);
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const cx = col * 10 * s;
      const cy = row * 10 * s;
      if (Math.sqrt(cx * cx + cy * cy) < (ANILOX_R - 4) * s) {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(ch.displayColor, cellAlpha);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Ink drip ─────────────────────────────────────────────
  const dripRadius = Math.max(2, 5 - viscosity * 0.06);
  ctx.beginPath();
  ctx.arc(
    (CHAMBER_X + CHAMBER_W / 2) * s,
    dripY * s,
    dripRadius * s, 0, Math.PI * 2,
  );
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.8);
  ctx.fill();

  // ── Ink chamber ──────────────────────────────────────────
  const chamberFill = 0.2 + (strength / 120) * 0.6;
  ctx.fillStyle = `rgba(245,248,250,0.95)`;
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.roundRect(CHAMBER_X * s, CHAMBER_Y * s, CHAMBER_W * s, CHAMBER_H * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  const fillH = CHAMBER_H * chamberFill;
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.55);
  ctx.beginPath();
  ctx.roundRect(
    (CHAMBER_X + 2) * s,
    (CHAMBER_Y + CHAMBER_H - fillH) * s,
    (CHAMBER_W - 4) * s,
    (fillH - 2) * s,
    [0, 0, 3 * s, 3 * s],
  );
  ctx.fill();

  // Doctor blade
  const doctorWarning = impression > 80 || viscosity > 38;
  ctx.strokeStyle = doctorWarning ? "#e08c00" : "#455a64";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo((CHAMBER_X + CHAMBER_W) * s, (CHAMBER_Y + CHAMBER_H) * s);
  ctx.lineTo((ANILOX_CX + ANILOX_R - 4) * s, (ANILOX_CY + 8) * s);
  ctx.stroke();

  // Containment blade
  const containmentWarning = mode === "operate" && dryingRisk > 65;
  ctx.strokeStyle = containmentWarning ? "#e08c00" : "#455a64";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(CHAMBER_X * s, (CHAMBER_Y + CHAMBER_H) * s);
  ctx.lineTo((ANILOX_CX - ANILOX_R + 4) * s, (ANILOX_CY + 8) * s);
  ctx.stroke();

  if (doctorWarning && mode === "operate") {
    ctx.fillStyle = "#e08c00";
    ctx.font = `bold ${9 * s}px Inter, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("!", (ANILOX_CX + ANILOX_R + 2) * s, (ANILOX_CY + 10) * s);
  }
}

type CalloutDef = {
  key: string;
  label: string;
  x: number;
  y: number;
};

const OPERATE_CALLOUTS: CalloutDef[] = [
  { key: "anilox",     label: "Anilox",     x: 360, y: 195 },
  { key: "viscosity",  label: "Viscosity",  x: 40,  y: 195 },
  { key: "impression", label: "Impression", x: 360, y: 320 },
  { key: "strength",   label: "Strength",   x: 40,  y: 320 },
];

const LEARN_LABELS: { key: string; educationKey: string; x: number; y: number }[] = [
  { key: "inkChamber",       educationKey: "inkChamber",       x: 40,  y: 50  },
  { key: "doctorBlade",      educationKey: "doctorBlade",      x: 400, y: 155 },
  { key: "containmentBlade", educationKey: "containmentBlade", x: 40,  y: 155 },
  { key: "aniloxRoll",       educationKey: "aniloxRoll",       x: 360, y: 185 },
  { key: "plateCylinder",    educationKey: "plateCylinder",    x: 360, y: 305 },
  { key: "web",              educationKey: "web",              x: 360, y: 370 },
  { key: "ciDrum",           educationKey: "ciDrum",           x: 360, y: 405 },
];

export function StationDetail({ job, settings, outcome, mode, channelId, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const aniloxAngleRef = useRef(0);
  const dripYRef = useRef(CHAMBER_Y + CHAMBER_H + 5);

  const ch = job.channels.find(c => c.id === channelId) ?? job.channels[0];
  const inkSettings = settings.inkChannels[channelId];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viscosity = inkSettings?.viscosity ?? 28;
    const dripSpeed = 2.5 / (viscosity / 28);
    const dripTarget = (ANILOX_CY - ANILOX_R) - 2;

    function tick() {
      aniloxAngleRef.current = (aniloxAngleRef.current + 0.6) % 360;
      dripYRef.current += dripSpeed;
      if (dripYRef.current > dripTarget) {
        dripYRef.current = CHAMBER_Y + CHAMBER_H + 5;
      }
      drawFrame(ctx!, ch, inkSettings, aniloxAngleRef.current, dripYRef.current, mode, outcome.dryingRisk);
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [ch, inkSettings, mode, outcome.dryingRisk]);

  return (
    <div className="station-detail" data-testid="station-detail" style={{ position: "relative" }}>
      <button type="button" className="press-back-btn" onClick={onBack}>
        ← Back to press
      </button>
      <div style={{ position: "relative", maxWidth: SD_W }}>
        <canvas
          ref={canvasRef}
          width={SD_W * SD_SCALE}
          height={SD_H * SD_SCALE}
          style={{ width: SD_W, height: SD_H }}
        />

        {mode === "operate" && OPERATE_CALLOUTS.map(c => {
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

        {mode === "learn" && LEARN_LABELS.map(l => (
          <div
            key={l.key}
            data-testid={`learn-label-${l.key}`}
            className="station-callout station-callout--learn"
            style={{ top: l.y, left: l.x }}
          >
            <span className="callout-name">
              {PRESS_EDUCATION[l.educationKey]?.name ?? l.key}
            </span>
            {PRESS_EDUCATION[l.educationKey]?.description}
          </div>
        ))}
      </div>
    </div>
  );
}
