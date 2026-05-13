import type { ChannelDef } from "../../domain/types";

const SCALE     = 4;
const POUCH_W   = 280 * SCALE;
const POUCH_H   = 400 * SCALE;
const POUCH_TOP =  10 * SCALE;

export function drawLabelPrintChannel(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  _regX: number,
  _regY: number,
  density: number,
  _gain: number,
  _showDots: boolean,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = ch.displayColor;
  ctx.globalAlpha = Math.min(1, Math.max(0.15, density / ch.targetDensity)) * 0.35;
  ctx.fillRect(pouchX, POUCH_TOP, POUCH_W, POUCH_H);
  ctx.restore();
}
