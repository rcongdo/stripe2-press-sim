import type { ChannelDef } from "../../domain/types";

// Must match PrintPreview.tsx constants
const SCALE       = 4;
const W_CANVAS    = 920 * SCALE;   // 3680
const H_CANVAS    = 420 * SCALE;   // 1680
const PITCH       = 12;             // halftone cell size (px), matches snackPouch
const MIN_ALPHA   = 0.25;

// PrintPreview iterates POUCH_ORIGINS and calls drawChannel once per origin.
// Custom PDFs fill the whole canvas, so we only draw on the first (leftmost) pass.
const FIRST_POUCH_X = 10 * SCALE;  // POUCH_ORIGINS[0]

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
  return function drawPdfChannel(ctx, ch, pouchX, regX, regY, density, gain, showDots) {
    // Skip the two duplicate passes; draw once to fill the full canvas
    if (pouchX !== FIRST_POUCH_X) return;

    const img = layerImages[ch.id];
    if (!img) return;

    const densityScale = Math.min(1.5, density / (ch.targetDensity || 1));
    ctx.save();
    ctx.fillStyle = ch.displayColor;

    if (showDots) {
      ctx.globalAlpha = Math.min(1, Math.max(MIN_ALPHA, density));
      drawPdfHalftone(ctx, img, ch, regX, regY, gain, densityScale);
    } else {
      ctx.globalAlpha = Math.min(1, Math.max(0.05, densityScale));
      ctx.drawImage(img, regX, regY, W_CANVAS, H_CANVAS);
    }

    ctx.restore();
  };
}

// CMYK channels are colorized (C→cyan, M→magenta, Y→yellow, K→black).
// Coverage must be read from the complementary axis, not overall brightness.
// Spot channels are grayscale (dark = ink), so brightness inversion works.
function sampleCoverage(pixels: Uint8ClampedArray, pi: number, chId: string): number {
  const r = pixels[pi], g = pixels[pi + 1], b = pixels[pi + 2];
  switch (chId) {
    case "C": return 1 - r / 255;
    case "M": return 1 - g / 255;
    case "Y": return 1 - b / 255;
    default:  return 1 - (r + g + b) / (3 * 255); // K and all spot channels
  }
}

function drawPdfHalftone(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  ch: ChannelDef,
  regX: number,
  regY: number,
  gain: number,
  densityScale: number,
): void {
  // Down-sample to one pixel per halftone cell for coverage lookup.
  // Iterating in image space (no rotation) means each sample index maps
  // directly to the canvas cell it covers — no inverse-rotation needed.
  const gridW = Math.ceil(W_CANVAS / PITCH);
  const gridH = Math.ceil(H_CANVAS / PITCH);
  const sampleCanvas = new OffscreenCanvas(gridW, gridH);
  const sampleCtx = sampleCanvas.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D;
  sampleCtx.drawImage(img, 0, 0, gridW, gridH);
  const pixels = sampleCtx.getImageData(0, 0, gridW, gridH).data;

  const angle = (ch.screenAngle * Math.PI) / 180;
  const cosA  = Math.cos(angle);
  const sinA  = Math.sin(angle);

  // Rotation is applied around the canvas centre.
  const cx = W_CANVAS / 2;
  const cy = H_CANVAS / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W_CANVAS, H_CANVAS);
  ctx.clip();

  for (let gx = 0; gx < gridW; gx++) {
    for (let gy = 0; gy < gridH; gy++) {
      const pi = (gy * gridW + gx) * 4;
      const coverage = sampleCoverage(pixels, pi, ch.id) * densityScale;
      if (coverage < 0.01) continue;

      const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + gain * 1.5);
      if (radius < 0.5) continue;

      // Canvas centre of this unrotated cell
      const imgX = (gx + 0.5) * PITCH;
      const imgY = (gy + 0.5) * PITCH;

      // Rotate the cell position around the canvas centre, then shift by registration
      const dx = imgX - cx;
      const dy = imgY - cy;
      const dotX = cosA * dx - sinA * dy + cx + regX;
      const dotY = sinA * dx + cosA * dy + cy + regY;

      ctx.beginPath();
      ctx.arc(dotX, dotY, Math.max(0.5, radius), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
