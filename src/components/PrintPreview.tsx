import { useEffect, useRef } from "react";
import type { PressSettings, Registration, SimulationOutcome } from "../domain/types";

type PrintPreviewProps = {
  settings: PressSettings;
  outcome: SimulationOutcome;
};

const W = 920;
const H = 420;
const PITCH = 12;
const MIL_TO_PX = 4;
const MIN_PLATE_ALPHA = 0.25;

type Zone = { x: number; y: number; w: number; h: number };

const ZONES: Zone[] = [
  { x: 20,  y: 20,  w: 880, h: 78  },  // brand header
  { x: 20,  y: 106, w: 880, h: 196 },  // product graphic
  { x: 20,  y: 310, w: 880, h: 52  },  // flavor stripe
  { x: 20,  y: 370, w: 880, h: 32  },  // nutrition bar
];

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

function drawPlate(
  ctx: CanvasRenderingContext2D,
  channel: "C" | "M" | "Y" | "K",
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

  ZONES.forEach((zone, i) => {
    const coverage = coverages[i];
    if (coverage < 0.01) return;

    const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + (gain - 0.18) * 1.5);
    if (radius <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(zone.x, zone.y, zone.w, zone.h);
    ctx.clip();

    const cx = zone.x + zone.w / 2 + regX;
    const cy = zone.y + zone.h / 2 + regY;
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

  ctx.restore();
}

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fffdf8";
      ctx.beginPath();
      ctx.roundRect(16, 16, W - 32, H - 32, 10);
      ctx.fill();

      // CMYK plates in standard print order: Y → M → C → K
      for (const ch of ["Y", "M", "C", "K"] as const) {
        const regX = settings.registration[REG_KEYS[ch].x] * MIL_TO_PX;
        const regY = settings.registration[REG_KEYS[ch].y] * MIL_TO_PX;
        drawPlate(ctx, ch, regX, regY, outcome.gain, outcome.density);
      }

      // Pinhole defects — small white voids
      if (outcome.defects.pinholes > 0) {
        ctx.save();
        ctx.globalAlpha = outcome.defects.pinholes / 100;
        ctx.fillStyle = "#fffdf8";
        for (let i = 0; i < 24; i++) {
          ctx.beginPath();
          ctx.arc(60 + ((i * 37) % 800), 30 + ((i * 53) % 360), 2 + (i % 3), 0, Math.PI * 2);
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
          ctx.fillRect(30 + ((i * 31) % 860), 22 + ((i * 43) % 376), 3 + (i % 6), 1);
        }
        ctx.restore();
      }

      // Skips — elongated white voids (broken ink transfer)
      if (outcome.defects.skips > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.skips / 100) * 0.7;
        ctx.fillStyle = "#fffdf8";
        for (let i = 0; i < 20; i++) {
          ctx.fillRect(40 + ((i * 41) % 820), 25 + ((i * 67) % 370), 8 + (i % 5) * 3, 1);
        }
        ctx.restore();
      }

      // Edge squash — dark ink smear at zone top/bottom edges (excess impression)
      if (outcome.defects.edgeSquash > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.edgeSquash / 100) * 0.35;
        for (const zone of ZONES) {
          // Top edge of zone
          const topX = zone.x + zone.w / 2;
          const topY = zone.y;
          const grTop = ctx.createRadialGradient(topX, topY, 0, topX, topY, 24);
          grTop.addColorStop(0, "rgba(10,6,2,0.8)");
          grTop.addColorStop(1, "rgba(10,6,2,0)");
          ctx.fillStyle = grTop;
          ctx.fillRect(topX - 24, topY - 24, 48, 48);

          // Bottom edge of zone
          const botX = zone.x + zone.w / 2;
          const botY = zone.y + zone.h;
          const grBot = ctx.createRadialGradient(botX, botY, 0, botX, botY, 24);
          grBot.addColorStop(0, "rgba(10,6,2,0.8)");
          grBot.addColorStop(1, "rgba(10,6,2,0)");
          ctx.fillStyle = grBot;
          ctx.fillRect(botX - 24, botY - 24, 48, 48);
        }
        ctx.restore();
      }

      // Mottle — uneven ink film (radial gradient blotches)
      if (outcome.defects.mottle > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.mottle / 100) * 0.18;
        for (let i = 0; i < 12; i++) {
          const gx = 60 + ((i * 73) % 800);
          const gy = 30 + ((i * 59) % 360);
          const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40 + (i % 3) * 12);
          gr.addColorStop(0, "rgba(20,12,4,0.6)");
          gr.addColorStop(1, "rgba(20,12,4,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(gx - 52, gy - 52, 104, 104);
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
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", display: "block" }}
        aria-label="Simulated flexible packaging web"
        data-testid="print-canvas"
      />
    </section>
  );
}
