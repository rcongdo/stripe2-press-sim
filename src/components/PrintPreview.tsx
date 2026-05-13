import { useCallback, useEffect, useRef, useState } from "react";
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

const ZOOM_LEVELS = [1, 4] as const;
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

// Per-channel density targets — must match jobs.ts
const CH_TARGET_DENSITY: Record<"C"|"M"|"Y"|"K", number> = { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 };

// CMYK separation values for each artwork element (computed from RGB via standard UCR)
type ArtCmyk = { C: number; M: number; Y: number; K: number };
const ART_HEADER_BG:    ArtCmyk = { C: 0.65, M: 0.00, Y: 0.38, K: 0.71 }; // #1a4a2e forest green
const ART_HEADER_SUB:   ArtCmyk = { C: 0.20, M: 0.00, Y: 0.20, K: 0.17 }; // #a8d4a8 light green
const ART_SKY_TOP:      ArtCmyk = { C: 0.00, M: 0.31, Y: 0.86, K: 0.09 }; // #e8a020 amber
const ART_SKY_BOT:      ArtCmyk = { C: 0.00, M: 0.58, Y: 0.92, K: 0.25 }; // #c05010 deep amber
const ART_SUN:          ArtCmyk = { C: 0.00, M: 0.20, Y: 0.73, K: 0.06 }; // #f0c040 yellow
const ART_MOUNTAIN:     ArtCmyk = { C: 0.00, M: 0.45, Y: 0.72, K: 0.77 }; // #3a2010 dark brown
const ART_FLAVOR_BG:    ArtCmyk = { C: 0.00, M: 0.43, Y: 0.95, K: 0.17 }; // #d4780a amber
const ART_NUTRITION_BG: ArtCmyk = { C: 0.00, M: 0.02, Y: 0.09, K: 0.04 }; // #f5f0e0 cream
const ART_BROWN_TEXT:   ArtCmyk = { C: 0.00, M: 0.22, Y: 0.43, K: 0.71 }; // #4a3a2a dark brown

const REG_KEYS: Record<"C" | "M" | "Y" | "K", { x: keyof Registration; y: keyof Registration }> = {
  C: { x: "cyanX",    y: "cyanY" },
  M: { x: "magentaX", y: "magentaY" },
  Y: { x: "yellowX",  y: "yellowY" },
  K: { x: "blackX",   y: "blackY" },
};

// Die-cut outline — always drawn regardless of channels (structural context)
function drawDieCut(ctx: CanvasRenderingContext2D, pouchX: number) {
  ctx.save();
  ctx.strokeStyle = "#d4c9b0";
  ctx.lineWidth = SCALE;
  ctx.beginPath();
  ctx.roundRect(pouchX, POUCH_TOP, POUCH_W, POUCH_H, 8 * SCALE);
  ctx.stroke();
  ctx.restore();
}

// Draw one ink channel's contribution to the artwork using CMYK separation values.
// Registration offset is applied as a canvas translate so all elements shift together.
// Density scales each element's alpha relative to the channel's target density.
function drawArtworkForChannel(
  ctx: CanvasRenderingContext2D,
  channel: "C" | "M" | "Y" | "K",
  pouchX: number,
  regX: number,
  regY: number,
  density: number,
) {
  const densityScale = Math.min(1.5, density / CH_TARGET_DENSITY[channel]);
  const hz = ZONES[ZONE_HEADER];
  const gz = ZONES[ZONE_GRAPHIC];
  const fz = ZONES[ZONE_FLAVOR];
  const nz = ZONES[ZONE_NUTRITION];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = INK_COLOR[channel];

  // Clip to pouch + small bleed, then translate by registration offset
  ctx.save();
  ctx.beginPath();
  ctx.rect(pouchX - 2 * MIL_TO_PX, POUCH_TOP - 2 * MIL_TO_PX, POUCH_W + 4 * MIL_TO_PX, POUCH_H + 4 * MIL_TO_PX);
  ctx.clip();
  ctx.translate(regX, regY);

  function fi(art: ArtCmyk, drawFn: () => void) {
    const a = Math.min(1, art[channel] * densityScale);
    if (a < 0.005) return;
    ctx.globalAlpha = a;
    drawFn();
  }

  // Header background
  fi(ART_HEADER_BG, () => ctx.fillRect(pouchX + hz.x, hz.y, hz.w, hz.h));

  // "TRAIL MIX CO." subtext (light green — positive text, no reversal needed)
  fi(ART_HEADER_SUB, () => {
    ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("TRAIL MIX CO.", pouchX + POUCH_W / 2, hz.y + 54 * SCALE);
  });

  // Sky — two halves approximate the original gradient
  fi(ART_SKY_TOP, () => ctx.fillRect(pouchX + gz.x, gz.y,              gz.w, gz.h / 2));
  fi(ART_SKY_BOT, () => ctx.fillRect(pouchX + gz.x, gz.y + gz.h / 2,  gz.w, gz.h / 2));

  // Sun semicircle
  fi(ART_SUN, () => {
    ctx.beginPath();
    ctx.arc(pouchX + POUCH_W / 2, gz.y + 50 * SCALE, 36 * SCALE, Math.PI, 0);
    ctx.fill();
  });

  // Mountain silhouette
  fi(ART_MOUNTAIN, () => {
    ctx.beginPath();
    ctx.moveTo(pouchX,              gz.y + gz.h);
    ctx.lineTo(pouchX +  60 * SCALE, gz.y + 100 * SCALE);
    ctx.lineTo(pouchX + 110 * SCALE, gz.y + 150 * SCALE);
    ctx.lineTo(pouchX + 140 * SCALE, gz.y +  90 * SCALE);
    ctx.lineTo(pouchX + 180 * SCALE, gz.y + 140 * SCALE);
    ctx.lineTo(pouchX + 220 * SCALE, gz.y + 110 * SCALE);
    ctx.lineTo(pouchX + 280 * SCALE, gz.y + gz.h);
    ctx.closePath();
    ctx.fill();
  });

  // Flavor stripe
  fi(ART_FLAVOR_BG, () => ctx.fillRect(pouchX + fz.x, fz.y, fz.w, fz.h));

  // Nutrition bar
  fi(ART_NUTRITION_BG, () => ctx.fillRect(pouchX + nz.x, nz.y, nz.w, nz.h));

  // Nutrition text (dark brown positive text)
  fi(ART_BROWN_TEXT, () => {
    ctx.font = `${9 * SCALE}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO",
      pouchX + POUCH_W / 2,
      nz.y + 40 * SCALE,
    );
  });

  // Reversed-text knockout — inside translate so the hole shifts with this channel's registration.
  // When mis-registered, the hole drifts off the text, letting this channel's ink bleed in.
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#fffdf8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;
  ctx.font = `900 ${34 * SCALE}px Inter, sans-serif`;
  ctx.fillText("SUMMIT", pouchX + POUCH_W / 2, hz.y + hz.h * 0.48);
  ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
  ctx.fillText("ALPINE CLASSIC CRUNCH", pouchX + POUCH_W / 2, fz.y + fz.h / 2);
  ctx.restore();

  ctx.restore(); // pop translate + clip
  ctx.restore(); // pop compositeOperation
}

// 4× halftone dot grid for one channel — regions mirror drawArtworkForChannel exactly
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
  const densityScale = Math.min(1.5, density / CH_TARGET_DENSITY[channel]);
  const baseAlpha = Math.min(1, Math.max(MIN_PLATE_ALPHA, density));

  const hz = ZONES[ZONE_HEADER];
  const gz = ZONES[ZONE_GRAPHIC];
  const fz = ZONES[ZONE_FLAVOR];
  const nz = ZONES[ZONE_NUTRITION];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = INK_COLOR[channel];
  ctx.globalAlpha = baseAlpha;

  ctx.save();
  const REG_BLEED = 3 * MIL_TO_PX;
  ctx.beginPath();
  ctx.rect(pouchX - REG_BLEED, POUCH_TOP - REG_BLEED, POUCH_W + REG_BLEED * 2, POUCH_H + REG_BLEED * 2);
  ctx.clip();
  ctx.translate(regX, regY);

  // Draw halftone dots clipped to an arbitrary path. buildPath must leave an open path.
  function dotsInPath(buildPath: () => void, spanW: number, spanH: number, cx: number, cy: number, art: ArtCmyk) {
    const coverage = art[channel] * densityScale;
    if (coverage < 0.01) return;
    const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + gain * 1.5);
    if (radius < 0.5) return;
    ctx.save();
    ctx.beginPath();
    buildPath();
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const span = Math.ceil(Math.hypot(spanW, spanH) / 2) + PITCH;
    for (let dx = -span; dx <= span; dx += PITCH) {
      for (let dy = -span; dy <= span; dy += PITCH) {
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function dotsInRect(art: ArtCmyk, rx: number, ry: number, rw: number, rh: number) {
    dotsInPath(() => ctx.rect(rx, ry, rw, rh), rw, rh, rx + rw / 2, ry + rh / 2, art);
  }

  // Header background
  dotsInRect(ART_HEADER_BG, pouchX + hz.x, hz.y, hz.w, hz.h);

  // "TRAIL MIX CO." subtext — solid fill at this scale (text ≈ 100% halftone coverage)
  {
    const a = Math.min(1, ART_HEADER_SUB[channel] * densityScale);
    if (a >= 0.005) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("TRAIL MIX CO.", pouchX + POUCH_W / 2, hz.y + 54 * SCALE);
      ctx.restore();
    }
  }

  // Sky — upper half / lower half split to match the two-tone gradient
  dotsInRect(ART_SKY_TOP, pouchX + gz.x, gz.y,             gz.w, gz.h / 2);
  dotsInRect(ART_SKY_BOT, pouchX + gz.x, gz.y + gz.h / 2, gz.w, gz.h / 2);

  // Sun semicircle — exact arc path
  dotsInPath(
    () => {
      ctx.arc(pouchX + POUCH_W / 2, gz.y + 50 * SCALE, 36 * SCALE, Math.PI, 0);
      ctx.closePath();
    },
    72 * SCALE, 36 * SCALE,
    pouchX + POUCH_W / 2, gz.y + 50 * SCALE,
    ART_SUN,
  );

  // Mountain silhouette — exact polygon path
  dotsInPath(
    () => {
      ctx.moveTo(pouchX,               gz.y + gz.h);
      ctx.lineTo(pouchX +  60 * SCALE,  gz.y + 100 * SCALE);
      ctx.lineTo(pouchX + 110 * SCALE,  gz.y + 150 * SCALE);
      ctx.lineTo(pouchX + 140 * SCALE,  gz.y +  90 * SCALE);
      ctx.lineTo(pouchX + 180 * SCALE,  gz.y + 140 * SCALE);
      ctx.lineTo(pouchX + 220 * SCALE,  gz.y + 110 * SCALE);
      ctx.lineTo(pouchX + 280 * SCALE,  gz.y + gz.h);
      ctx.closePath();
    },
    POUCH_W, gz.h,
    pouchX + POUCH_W / 2, gz.y + gz.h * 0.7,
    ART_MOUNTAIN,
  );

  // Flavor stripe
  dotsInRect(ART_FLAVOR_BG, pouchX + fz.x, fz.y, fz.w, fz.h);

  // Nutrition bar
  dotsInRect(ART_NUTRITION_BG, pouchX + nz.x, nz.y, nz.w, nz.h);

  // Nutrition text — solid fill at this scale
  {
    const a = Math.min(1, ART_BROWN_TEXT[channel] * densityScale);
    if (a >= 0.005) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `${9 * SCALE}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO",
        pouchX + POUCH_W / 2,
        nz.y + 40 * SCALE,
      );
      ctx.restore();
    }
  }

  // Reversed-text knockout — inside translate so the hole shifts with this channel's registration.
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#fffdf8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;
  ctx.font = `900 ${34 * SCALE}px Inter, sans-serif`;
  ctx.fillText("SUMMIT", pouchX + POUCH_W / 2, hz.y + hz.h * 0.48);
  ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
  ctx.fillText("ALPINE CLASSIC CRUNCH", pouchX + POUCH_W / 2, fz.y + fz.h / 2);
  ctx.restore();

  ctx.restore();
  ctx.restore();
}


const CH_COLORS: Record<"C" | "M" | "Y" | "K", string> = {
  C: "#00bef0", M: "#e0009a", Y: "#c89400", K: "#222",
};

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const zoomIdx = ZOOM_LEVELS.indexOf(zoom);
  const showDots = zoom === 4;

  const [channelVisible, setChannelVisible] = useState<Record<"C"|"M"|"Y"|"K", boolean>>(
    { C: true, M: true, Y: true, K: true },
  );
  function toggleChannel(ch: "C"|"M"|"Y"|"K") {
    setChannelVisible(prev => ({ ...prev, [ch]: !prev[ch] }));
  }

  // Pan state (only active at 4×)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Reset pan when leaving 4×
  useEffect(() => {
    if (zoom !== 4) setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  const clampPan = useCallback((x: number, y: number, vpW: number, vpH: number) => {
    const canvasW = W * 4;
    const canvasH = H * 4;
    return {
      x: Math.min(0, Math.max(vpW - canvasW, x)),
      y: Math.min(0, Math.max(vpH - canvasH, y)),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom !== 4) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: panOffset.x, oy: panOffset.y };
  }, [zoom, panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || zoom !== 4) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const vp = viewportRef.current;
    const vpW = vp ? vp.clientWidth : W;
    const vpH = vp ? vp.clientHeight : H;
    setPanOffset(clampPan(dragStart.current.ox + dx, dragStart.current.oy + dy, vpW, vpH));
  }, [zoom, clampPan]);

  const handlePointerUp = useCallback(() => {
    dragStart.current = null;
  }, []);

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

      // CMYK channels in standard print order: Y → M → C → K
      // 1×: draw artwork as proper CMYK separation (channel isolation works correctly)
      // 4×: draw halftone dot grid only
      for (const pouchX of POUCH_ORIGINS) {
        for (const ch of ["Y", "M", "C", "K"] as const) {
          if (!channelVisible[ch]) continue;
          const regX = settings.registration[REG_KEYS[ch].x] * MIL_TO_PX;
          const regY = settings.registration[REG_KEYS[ch].y] * MIL_TO_PX;
          if (showDots) {
            drawPlate(ctx, ch, pouchX, regX, regY, outcome.channelGain[ch], outcome.channelDensity[ch]);
          } else {
            drawArtworkForChannel(ctx, ch, pouchX, regX, regY, outcome.channelDensity[ch]);
          }
        }
      }

      // Die-cut outlines drawn last so they sit on top of any bleeding dots
      for (const pouchX of POUCH_ORIGINS) {
        drawDieCut(ctx, pouchX);
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
  }, [settings, outcome, showDots, channelVisible]);

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <div className="channel-toggles" role="group" aria-label="Visible channels">
          {(["C", "M", "Y", "K"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              aria-pressed={channelVisible[ch]}
              className={`ch-toggle-btn${channelVisible[ch] ? " ch-toggle-btn--on" : ""}`}
              style={{ "--ch-color": CH_COLORS[ch] } as React.CSSProperties}
              onClick={() => toggleChannel(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
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
      <div
        ref={viewportRef}
        className={`print-canvas-viewport${zoom === 4 ? " print-canvas-viewport--pan" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={W_CANVAS}
          height={H_CANVAS}
          style={{
            width: W * zoom,
            height: H * zoom,
            display: "block",
            transform: zoom === 4 ? `translate(${panOffset.x}px, ${panOffset.y}px)` : undefined,
            transformOrigin: "top left",
          }}
          aria-label="Simulated flexible packaging web"
          data-testid="print-canvas"
        />
      </div>
    </section>
  );
}
