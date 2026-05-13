import { useEffect, useRef, useState } from "react";
import type { PressSettings, Registration, SimulationOutcome } from "../domain/types";

type PrintPreviewProps = {
  settings: PressSettings;
  outcome: SimulationOutcome;
};

// Logical display dimensions (CSS pixels at 1× zoom)
const W = 920;
const H = 420;
// Internal canvas render scale — 4× logical gives sub-pixel dots at 1× zoom,
// crisp 12px dots at 4× zoom (1:1 native)
const SCALE = 4;
const W_CANVAS = W * SCALE;   // 3680
const H_CANVAS = H * SCALE;   // 1680

const PITCH = 12;              // internal pixels per dot-grid step
const MIL_TO_PX = 4 * SCALE;  // 16 internal pixels per mil
const MIN_PLATE_ALPHA = 0.25;

const POUCH_W   = 280 * SCALE;  // 1120
const POUCH_H   = 400 * SCALE;  // 1600
const POUCH_TOP =  10 * SCALE;  // 40
const POUCH_ORIGINS = [10 * SCALE, 310 * SCALE, 610 * SCALE] as const; // [40,1240,2440]

const ZOOM_LEVELS = [0.5, 1, 2, 4] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

type Zone = { x: number; y: number; w: number; h: number };

// Per-pouch zone coordinates — x relative to pouchX, all values in internal pixels
const ZONES: Zone[] = [
  { x: 0, y:   40, w: POUCH_W, h: 240 },  // header
  { x: 0, y:  280, w: POUCH_W, h: 880 },  // product graphic
  { x: 0, y: 1160, w: POUCH_W, h: 200 },  // flavor stripe
  { x: 0, y: 1360, w: POUCH_W, h: 280 },  // nutrition bar
];

const ZONE_HEADER    = 0;
const ZONE_GRAPHIC   = 1;
const ZONE_FLAVOR    = 2;
const ZONE_NUTRITION = 3;

// CMYK ink coverage per zone [header, graphic, flavor, nutrition]
const COVERAGE: Record<"C" | "M" | "Y" | "K", [number, number, number, number]> = {
  C: [0.15, 0.60, 0.05, 0.05],
  M: [0.20, 0.50, 0.35, 0.05],
  Y: [0.10, 0.40, 0.70, 0.05],
  K: [0.85, 0.15, 0.55, 0.70],
};

const SCREEN_ANGLE: Record<"C" | "M" | "Y" | "K", number> = {
  C: (15 * Math.PI) / 180,
  M: (75 * Math.PI) / 180,
  Y: 0,
  K: (45 * Math.PI) / 180,
};

const INK_COLOR: Record<"C" | "M" | "Y" | "K", string> = {
  C: "rgb(0,190,220)",
  M: "rgb(220,0,150)",
  Y: "rgb(255,210,0)",
  K: "rgb(20,20,20)",
};

const REG_KEYS: Record<"C" | "M" | "Y" | "K", { x: keyof Registration; y: keyof Registration }> = {
  C: { x: "cyanX",    y: "cyanY" },
  M: { x: "magentaX", y: "magentaY" },
  Y: { x: "yellowX",  y: "yellowY" },
  K: { x: "blackX",   y: "blackY" },
};

function drawArtwork(ctx: CanvasRenderingContext2D, pouchX: number) {
  const headerZone    = ZONES[ZONE_HEADER];
  const graphicZone   = ZONES[ZONE_GRAPHIC];
  const flavorZone    = ZONES[ZONE_FLAVOR];
  const nutritionZone = ZONES[ZONE_NUTRITION];

  // Pouch die-cut outline
  ctx.save();
  ctx.strokeStyle = "#d4c9b0";
  ctx.lineWidth = SCALE;
  ctx.beginPath();
  ctx.roundRect(pouchX, POUCH_TOP, POUCH_W, POUCH_H, 8 * SCALE);
  ctx.stroke();
  ctx.restore();

  // Header — forest green background with brand name
  ctx.save();
  ctx.fillStyle = "#1a4a2e";
  ctx.fillRect(pouchX + headerZone.x, headerZone.y, headerZone.w, headerZone.h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${28 * SCALE}px Inter, sans-serif`;
  ctx.fillText("SUMMIT", pouchX + POUCH_W / 2, headerZone.y + 36 * SCALE);
  ctx.fillStyle = "#a8d4a8";
  ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
  ctx.fillText("TRAIL MIX CO.", pouchX + POUCH_W / 2, headerZone.y + 54 * SCALE);
  ctx.restore();

  // Product graphic — amber sky gradient + mountain polygon + sun arc
  ctx.save();
  // Vertical gradient — x coordinates are irrelevant for a top-to-bottom fill
  const skyGrad = ctx.createLinearGradient(0, graphicZone.y, 0, graphicZone.y + graphicZone.h);
  skyGrad.addColorStop(0, "#e8a020");
  skyGrad.addColorStop(1, "#c05010");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(pouchX + graphicZone.x, graphicZone.y, graphicZone.w, graphicZone.h);

  // Sun
  ctx.beginPath();
  ctx.arc(pouchX + POUCH_W / 2, graphicZone.y + 50 * SCALE, 36 * SCALE, Math.PI, 0);
  ctx.fillStyle = "#f0c040";
  ctx.fill();

  // Mountain silhouette
  ctx.beginPath();
  ctx.moveTo(pouchX,             graphicZone.y + graphicZone.h);
  ctx.lineTo(pouchX +  60*SCALE, graphicZone.y + 100*SCALE);
  ctx.lineTo(pouchX + 110*SCALE, graphicZone.y + 150*SCALE);
  ctx.lineTo(pouchX + 140*SCALE, graphicZone.y +  90*SCALE);
  ctx.lineTo(pouchX + 180*SCALE, graphicZone.y + 140*SCALE);
  ctx.lineTo(pouchX + 220*SCALE, graphicZone.y + 110*SCALE);
  ctx.lineTo(pouchX + 280*SCALE, graphicZone.y + graphicZone.h);
  ctx.closePath();
  ctx.fillStyle = "#3a2010";
  ctx.fill();
  ctx.restore();

  // Flavor stripe — amber band with product name
  ctx.save();
  ctx.fillStyle = "#d4780a";
  ctx.fillRect(pouchX + flavorZone.x, flavorZone.y, flavorZone.w, flavorZone.h);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${13 * SCALE}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("ALPINE CLASSIC CRUNCH", pouchX + POUCH_W / 2, flavorZone.y + 32 * SCALE);
  ctx.restore();

  // Nutrition bar — cream background with claims text
  ctx.save();
  ctx.fillStyle = "#f5f0e0";
  ctx.fillRect(pouchX + nutritionZone.x, nutritionZone.y, nutritionZone.w, nutritionZone.h);
  ctx.fillStyle = "#4a3a2a";
  ctx.font = `${9 * SCALE}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO",
    pouchX + POUCH_W / 2,
    nutritionZone.y + 40 * SCALE,
  );
  ctx.restore();
}

function drawPlate(
  ctx: CanvasRenderingContext2D,
  channel: "C" | "M" | "Y" | "K",
  pouchX: number,
  regX: number,
  regY: number,
  gain: number,
  density: number,
) {
  const angle = SCREEN_ANGLE[channel];
  const coverages = COVERAGE[channel];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = INK_COLOR[channel];
  ctx.globalAlpha = Math.min(1, Math.max(MIN_PLATE_ALPHA, density));

  // Single pouch-level clip with registration bleed — lets misaligned dots
  // appear at artwork edges instead of being cut off by per-zone clipping
  ctx.save();
  const REG_BLEED = 4 * MIL_TO_PX; // 64 internal px; gutter between pouches is 80px so no cross-bleed
  ctx.beginPath();
  ctx.rect(pouchX - REG_BLEED, POUCH_TOP - REG_BLEED, POUCH_W + REG_BLEED * 2, POUCH_H + REG_BLEED * 2);
  ctx.clip();

  ZONES.forEach((zone, i) => {
    const coverage = coverages[i];
    if (coverage < 0.01) return;

    const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + (gain - 0.18) * 1.5);
    if (radius <= 0) return;

    const cx = pouchX + zone.x + zone.w / 2 + regX;
    const cy = zone.y + zone.h / 2 + regY;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const span = Math.ceil(Math.hypot(zone.w, zone.h) / 2) + PITCH;
    for (let dx = -span; dx <= span; dx += PITCH) {
      for (let dy = -span; dy <= span; dy += PITCH) {
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });

  ctx.restore(); // pop pouch clip
  ctx.restore(); // pop globalAlpha / compositeOperation
}

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const zoomIdx = ZOOM_LEVELS.indexOf(zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Substrate background
      ctx.fillStyle = "#f6f1e8";
      ctx.fillRect(0, 0, W_CANVAS, H_CANVAS);
      ctx.fillStyle = "#fffdf8";
      ctx.beginPath();
      ctx.roundRect(4 * SCALE, 4 * SCALE, W_CANVAS - 8 * SCALE, H_CANVAS - 8 * SCALE, 6 * SCALE);
      ctx.fill();

      // Artwork layer — draw brand elements for all 3 pouches before plates
      for (const pouchX of POUCH_ORIGINS) {
        drawArtwork(ctx, pouchX);
      }

      // CMYK plates in standard print order: Y → M → C → K, for all 3 pouches
      for (const pouchX of POUCH_ORIGINS) {
        for (const ch of ["Y", "M", "C", "K"] as const) {
          const regX = settings.registration[REG_KEYS[ch].x] * MIL_TO_PX;
          const regY = settings.registration[REG_KEYS[ch].y] * MIL_TO_PX;
          drawPlate(ctx, ch, pouchX, regX, regY, outcome.channelGain[ch], outcome.channelDensity[ch]);
        }
      }

      // Defect overlays below are web-wide (not per-pouch) — positions scatter across full canvas width

      // Pinhole defects — small white voids scattered across full web
      if (outcome.defects.pinholes > 0) {
        ctx.save();
        ctx.globalAlpha = outcome.defects.pinholes / 100;
        ctx.fillStyle = "#fffdf8";
        for (let i = 0; i < 24; i++) {
          ctx.beginPath();
          ctx.arc(
            (60 + ((i * 37) % 800)) * SCALE,
            (30 + ((i * 53) % 360)) * SCALE,
            (2 + (i % 3)) * SCALE,
            0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      // Dirty print — horizontal ink slur streaks
      if (outcome.defects.dirtyPrint > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.dirtyPrint / 100) * 0.4;
        ctx.fillStyle = "#1a1207";
        for (let i = 0; i < 28; i++) {
          ctx.fillRect(
            (30 + ((i * 31) % 860)) * SCALE,
            (22 + ((i * 43) % 376)) * SCALE,
            (3 + (i % 6)) * SCALE,
            SCALE,
          );
        }
        ctx.restore();
      }

      // Skips — elongated white voids (broken ink transfer)
      if (outcome.defects.skips > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.skips / 100) * 0.7;
        ctx.fillStyle = "#fffdf8";
        for (let i = 0; i < 20; i++) {
          ctx.fillRect(
            (40 + ((i * 41) % 820)) * SCALE,
            (25 + ((i * 67) % 370)) * SCALE,
            (8 + (i % 5) * 3) * SCALE,
            SCALE,
          );
        }
        ctx.restore();
      }

      // Edge squash is per-pouch — loops POUCH_ORIGINS because it renders at zone edges
      if (outcome.defects.edgeSquash > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.edgeSquash / 100) * 0.35;
        const edgeR = 24 * SCALE;
        for (const pouchX of POUCH_ORIGINS) {
          for (const zone of ZONES) {
            const topX = pouchX + zone.x + zone.w / 2;
            const topY = zone.y;
            const grTop = ctx.createRadialGradient(topX, topY, 0, topX, topY, edgeR);
            grTop.addColorStop(0, "rgba(10,6,2,0.8)");
            grTop.addColorStop(1, "rgba(10,6,2,0)");
            ctx.fillStyle = grTop;
            ctx.fillRect(topX - edgeR, topY - edgeR, edgeR * 2, edgeR * 2);

            const botY = zone.y + zone.h;
            const grBot = ctx.createRadialGradient(topX, botY, 0, topX, botY, edgeR);
            grBot.addColorStop(0, "rgba(10,6,2,0.8)");
            grBot.addColorStop(1, "rgba(10,6,2,0)");
            ctx.fillStyle = grBot;
            ctx.fillRect(topX - edgeR, botY - edgeR, edgeR * 2, edgeR * 2);
          }
        }
        ctx.restore();
      }

      // Mottle — uneven ink film (radial gradient blotches)
      if (outcome.defects.mottle > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.mottle / 100) * 0.18;
        for (let i = 0; i < 12; i++) {
          const gx = (60 + ((i * 73) % 800)) * SCALE;
          const gy = (30 + ((i * 59) % 360)) * SCALE;
          const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, (40 + (i % 3) * 12) * SCALE);
          gr.addColorStop(0, "rgba(20,12,4,0.6)");
          gr.addColorStop(1, "rgba(20,12,4,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(gx - 52 * SCALE, gy - 52 * SCALE, 104 * SCALE, 104 * SCALE);
        }
        ctx.restore();
      }
    });

    return () => { cancelled = true; cancelAnimationFrame(frameId); };
  }, [settings, outcome]);

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <div className="zoom-controls">
          <button
            type="button"
            className="secondary-button zoom-btn"
            aria-label="Zoom out"
            disabled={zoomIdx === 0}
            onClick={() => { if (zoomIdx > 0) setZoom(ZOOM_LEVELS[zoomIdx - 1]); }}
          >−</button>
          <span className="zoom-label">{zoom}×</span>
          <button
            type="button"
            className="secondary-button zoom-btn"
            aria-label="Zoom in"
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            onClick={() => { if (zoomIdx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[zoomIdx + 1]); }}
          >+</button>
        </div>
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <canvas
        ref={canvasRef}
        width={W_CANVAS}
        height={H_CANVAS}
        style={{
          width: W * zoom,
          height: H * zoom,
          display: "block",
        }}
        aria-label="Simulated flexible packaging web"
        data-testid="print-canvas"
      />
    </section>
  );
}
