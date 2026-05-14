import type { ChannelDef } from "../../domain/types";

// Must match PrintPreview.tsx constants
const SCALE     = 4;
const POUCH_W   = 280 * SCALE; // 1120
const POUCH_H   = 400 * SCALE; // 1600
const POUCH_TOP =  10 * SCALE; //   40

type DrawChannelFn = (
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  regX: number,
  regY: number,
  density: number,
  gain: number,
  showDots: boolean,
) => void;

export function createPdfDrawChannel(
  layerImages: Record<string, ImageBitmap>,
): DrawChannelFn {
  return function drawPdfChannel(ctx, ch, pouchX, regX, regY, density, _gain, _showDots) {
    const img = layerImages[ch.id];
    if (!img) return;
    const alpha = Math.min(1, Math.max(0.05, density / (ch.targetDensity || 1)));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, pouchX + regX, POUCH_TOP + regY, POUCH_W, POUCH_H);
    ctx.restore();
  };
}
