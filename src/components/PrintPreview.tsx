import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelDef, ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../domain/types";
import { drawSnackPouchChannel } from "./artwork/snackPouch";
import { drawLabelPrintChannel } from "./artwork/labelPrint";
import type { CustomPdfJob } from "../domain/types";
import { createPdfDrawChannel } from "./artwork/pdfArtwork";

type DrawChannelFn = (
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number, regX: number, regY: number,
  density: number, gain: number, showDots: boolean,
) => void;

const ARTWORK_RENDERERS: Record<string, DrawChannelFn> = {
  "snack-pouch-cmyk": drawSnackPouchChannel,
  "label-print":      drawLabelPrintChannel,
};

function isCustomPdfJob(job: JobPreset): job is CustomPdfJob {
  return "customPdf" in job;
}

type PrintPreviewProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
};

const W = 920;
const H = 420;
const SCALE = 4;
const W_CANVAS = W * SCALE;
const H_CANVAS = H * SCALE;

const PITCH = 12;
const MIL_TO_PX = 4 * SCALE;
const MIN_PLATE_ALPHA = 0.25;
const POUCH_W   = 280 * SCALE;
const POUCH_H   = 400 * SCALE;
const POUCH_TOP =  10 * SCALE;
const POUCH_ORIGINS = [10 * SCALE, 310 * SCALE, 610 * SCALE] as const;

const ZOOM_LEVELS = [1, 4] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

type Zone = { x: number; y: number; w: number; h: number };
const ZONES: Zone[] = [
  { x: 0, y:   40, w: POUCH_W, h: 240 },
  { x: 0, y:  280, w: POUCH_W, h: 880 },
  { x: 0, y: 1160, w: POUCH_W, h: 200 },
  { x: 0, y: 1360, w: POUCH_W, h: 280 },
];

// Barcode constants (snack pouch only)
const BC_MODULE  = 6;
const BC_QUIET   = 9 * BC_MODULE;
const BC_BAR_H   = 76;
const BC_GUARD_H = 96;
const BC_NUM_H   = 28;
const BC_PAD     = 12;
const BC_BOX_W   = 95 * BC_MODULE + 2 * BC_QUIET + 2 * BC_PAD;
const BC_BOX_H   = BC_GUARD_H + BC_NUM_H + 2 * BC_PAD;
const BC_BOX_X   = Math.round((POUCH_W - BC_BOX_W) / 2);
const BC_BOX_Y   = ZONES[3].y + ZONES[3].h - BC_BOX_H - 12;

const L_CODES: Record<string, string> = {
  "0":"0001101","1":"0011001","2":"0010011","3":"0111101",
  "4":"0100011","5":"0110001","6":"0101111","7":"0111011",
  "8":"0110111","9":"0001011",
};
const R_CODES: Record<string, string> = {
  "0":"1110010","1":"1100110","2":"1101100","3":"1000010",
  "4":"1011100","5":"1001110","6":"1010000","7":"1000100",
  "8":"1001000","9":"1110100",
};
const BC_DIGITS = "012345678905";
const BC_PATTERN = (
  "101" +
  BC_DIGITS.slice(0,6).split("").map(c => L_CODES[c]).join("") +
  "01010" +
  BC_DIGITS.slice(6,12).split("").map(c => R_CODES[c]).join("") +
  "101"
);

function drawDieCut(ctx: CanvasRenderingContext2D, pouchX: number) {
  ctx.save();
  ctx.strokeStyle = "#d4c9b0";
  ctx.lineWidth = SCALE;
  ctx.beginPath();
  ctx.roundRect(pouchX, POUCH_TOP, POUCH_W, POUCH_H, 8 * SCALE);
  ctx.stroke();
  ctx.restore();
}

export function PrintPreview({ job, settings, outcome }: PrintPreviewProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const viewportRef  = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<OffscreenCanvas | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const zoomIdx  = ZOOM_LEVELS.indexOf(zoom);
  const showDots = zoom === 4;

  // Channel visibility — synced with active channels in settings
  const [channelVisible, setChannelVisible] = useState<Record<ChannelId, boolean>>(() =>
    Object.fromEntries(Object.keys(settings.inkChannels).map(id => [id, true]))
  );
  useEffect(() => {
    setChannelVisible(prev => {
      const activeIds = Object.keys(settings.inkChannels);
      const next: Record<ChannelId, boolean> = {};
      for (const id of activeIds) next[id] = prev[id] ?? true;
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(settings.inkChannels).sort().join(",")]);

  function toggleChannel(id: ChannelId) {
    setChannelVisible(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

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

      ctx.fillStyle = "#f6f1e8";
      ctx.fillRect(0, 0, W_CANVAS, H_CANVAS);
      ctx.fillStyle = "#fffdf8";
      ctx.beginPath();
      ctx.roundRect(4 * SCALE, 4 * SCALE, W_CANVAS - 8 * SCALE, H_CANVAS - 8 * SCALE, 6 * SCALE);
      ctx.fill();

      if (!offscreenRef.current) {
        offscreenRef.current = new OffscreenCanvas(W_CANVAS, H_CANVAS);
      }
      const offscreen = offscreenRef.current;
      const offCtx = offscreen.getContext("2d")!;

      const drawChannel = isCustomPdfJob(job)
        ? createPdfDrawChannel(job.customPdf.layerImages)
        : (ARTWORK_RENDERERS[job.id] ?? drawLabelPrintChannel);

      // Sort: white backing first, then process channels Y→M→C→K, then other spots
      const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
      const PROCESS_ORDER = ["Y", "M", "C", "K"];
      const sortedChannels = [
        ...activeChannels.filter(ch => ch.id === "white"),
        ...activeChannels.filter(ch => ch.isProcess).sort(
          (a, b) => PROCESS_ORDER.indexOf(a.id) - PROCESS_ORDER.indexOf(b.id)
        ),
        ...activeChannels.filter(ch => !ch.isProcess && ch.id !== "white"),
      ];

      for (const chDef of sortedChannels) {
        if (!channelVisible[chDef.id]) continue;
        offCtx.clearRect(0, 0, W_CANVAS, H_CANVAS);

        for (const pouchX of POUCH_ORIGINS) {
          const reg  = settings.registration[chDef.id] ?? { x: 0, y: 0 };
          const regX = reg.x * MIL_TO_PX;
          const regY = reg.y * MIL_TO_PX;
          drawChannel(
            offCtx as unknown as CanvasRenderingContext2D,
            chDef, pouchX, regX, regY,
            outcome.channelDensity[chDef.id] ?? 0,
            outcome.channelGain[chDef.id] ?? 0,
            showDots,
          );
        }

        // Snack pouch: barcode box knockout + K bars
        if (job.id === "snack-pouch-cmyk") {
          offCtx.save();
          offCtx.globalCompositeOperation = "destination-out";
          offCtx.globalAlpha = 1;
          for (const pouchX of POUCH_ORIGINS) {
            offCtx.fillRect(pouchX + BC_BOX_X, BC_BOX_Y, BC_BOX_W, BC_BOX_H);
          }
          offCtx.restore();

          if (chDef.id === "K") {
            const reg  = settings.registration["K"] ?? { x: 0, y: 0 };
            const kRegX = reg.x * MIL_TO_PX;
            const kRegY = reg.y * MIL_TO_PX;
            const kDensity = outcome.channelDensity["K"] ?? 0;
            const kAlpha = Math.min(1, Math.max(MIN_PLATE_ALPHA, kDensity / 1.6));
            offCtx.save();
            offCtx.globalCompositeOperation = "source-over";
            offCtx.fillStyle = "#141414";
            offCtx.globalAlpha = kAlpha;
            for (const pouchX of POUCH_ORIGINS) {
              const bx = pouchX + BC_BOX_X + BC_PAD + BC_QUIET + kRegX;
              const by = BC_BOX_Y + BC_PAD + kRegY;
              for (let i = 0; i < BC_PATTERN.length; i++) {
                if (BC_PATTERN[i] === "1") {
                  const isGuard = i < 3 || (i >= 45 && i <= 49) || i >= 92;
                  offCtx.fillRect(bx + i * BC_MODULE, by, BC_MODULE, isGuard ? BC_GUARD_H : BC_BAR_H);
                }
              }
              offCtx.save();
              offCtx.font = `${5 * SCALE}px Inter, sans-serif`;
              offCtx.textAlign = "center";
              offCtx.textBaseline = "top";
              offCtx.fillText(BC_DIGITS.slice(0, 6),  bx + 3 * BC_MODULE + 21 * BC_MODULE, by + BC_GUARD_H + 2);
              offCtx.fillText(BC_DIGITS.slice(6, 12), bx + (3 + 42 + 5) * BC_MODULE + 21 * BC_MODULE, by + BC_GUARD_H + 2);
              offCtx.restore();
            }
            offCtx.restore();
          }
        }

        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
      }

      if (!isCustomPdfJob(job)) {
        for (const pouchX of POUCH_ORIGINS) {
          drawDieCut(ctx, pouchX);
        }
      }

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
  }, [job, settings, outcome, showDots, channelVisible]);

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <div className="channel-toggles" role="group" aria-label="Visible channels">
          {job.channels
            .filter(ch => ch.id in settings.inkChannels)
            .map(ch => (
              <button
                key={ch.id}
                type="button"
                aria-pressed={channelVisible[ch.id]}
                className={`ch-toggle-btn${channelVisible[ch.id] ? " ch-toggle-btn--on" : ""}`}
                style={{ "--ch-color": ch.displayColor } as React.CSSProperties}
                onClick={() => toggleChannel(ch.id)}
                aria-label={ch.name}
              >
                {ch.id.length === 1 ? ch.id : ch.id.slice(0, 2).toUpperCase()}
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
