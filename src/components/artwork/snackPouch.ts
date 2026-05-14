import type { ChannelDef } from "../../domain/types";

// Canvas geometry — must match PrintPreview.tsx constants
const SCALE        = 4;
const MIL_TO_PX    = 4 * SCALE;
const PITCH        = 12;
const POUCH_W      = 280 * SCALE;  // 1120
const POUCH_H      = 400 * SCALE;  // 1600
const POUCH_TOP    =  10 * SCALE;  // 40
const MIN_PLATE_ALPHA = 0.25;

type Zone = { x: number; y: number; w: number; h: number };
const ZONES: Zone[] = [
  { x: 0, y:   40, w: POUCH_W, h:  240 }, // header
  { x: 0, y:  280, w: POUCH_W, h:  880 }, // product graphic
  { x: 0, y: 1160, w: POUCH_W, h:  200 }, // flavor stripe
  { x: 0, y: 1360, w: POUCH_W, h:  280 }, // nutrition bar
];
const ZONE_HEADER    = 0;
const ZONE_GRAPHIC   = 1;
const ZONE_FLAVOR    = 2;
const ZONE_NUTRITION = 3;

type ProcessId = "C" | "M" | "Y" | "K";
type ArtCmyk = Record<ProcessId, number>;

const ART_SKY_TOP:      ArtCmyk = { C: 0.00, M: 0.31, Y: 0.86, K: 0.09 };
const ART_SKY_BOT:      ArtCmyk = { C: 0.00, M: 0.58, Y: 0.92, K: 0.25 };
const ART_SUN:          ArtCmyk = { C: 0.00, M: 0.20, Y: 0.73, K: 0.06 };
const ART_MOUNTAIN:     ArtCmyk = { C: 0.00, M: 0.45, Y: 0.72, K: 0.77 };
const ART_NUTRITION_BG: ArtCmyk = { C: 0.00, M: 0.02, Y: 0.09, K: 0.04 };
const ART_BROWN_TEXT:   ArtCmyk = { C: 0.00, M: 0.22, Y: 0.43, K: 0.71 };

function applyTextKnockout(ctx: CanvasRenderingContext2D, pouchX: number) {
  const hz = ZONES[ZONE_HEADER];
  const fz = ZONES[ZONE_FLAVOR];
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${34 * SCALE}px Inter, sans-serif`;
  ctx.fillText("SUMMIT", pouchX + POUCH_W / 2, hz.y + hz.h * 0.48);
  ctx.font = `800 ${11 * SCALE}px Inter, sans-serif`;
  ctx.fillText("ALPINE CLASSIC CRUNCH", pouchX + POUCH_W / 2, fz.y + fz.h / 2);
  ctx.restore();
}

function drawProcessArtwork(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  density: number,
) {
  const pid = ch.id as ProcessId;
  const densityScale = Math.min(1.5, density / ch.targetDensity);
  const hz = ZONES[ZONE_HEADER];
  const gz = ZONES[ZONE_GRAPHIC];
  const fz = ZONES[ZONE_FLAVOR];
  const nz = ZONES[ZONE_NUTRITION];

  function fi(art: ArtCmyk, drawFn: () => void) {
    const a = Math.min(1, art[pid] * densityScale);
    if (a < 0.005) return;
    ctx.globalAlpha = a;
    drawFn();
  }

  fi(ART_SKY_TOP, () => ctx.fillRect(pouchX + gz.x, gz.y,             gz.w, gz.h / 2));
  fi(ART_SKY_BOT, () => ctx.fillRect(pouchX + gz.x, gz.y + gz.h / 2, gz.w, gz.h / 2));
  fi(ART_SUN, () => {
    ctx.beginPath();
    ctx.arc(pouchX + POUCH_W / 2, gz.y + 50 * SCALE, 36 * SCALE, Math.PI, 0);
    ctx.fill();
  });
  fi(ART_MOUNTAIN, () => {
    ctx.beginPath();
    ctx.moveTo(pouchX,               gz.y + gz.h);
    ctx.lineTo(pouchX +  60 * SCALE, gz.y + 100 * SCALE);
    ctx.lineTo(pouchX + 110 * SCALE, gz.y + 150 * SCALE);
    ctx.lineTo(pouchX + 140 * SCALE, gz.y +  90 * SCALE);
    ctx.lineTo(pouchX + 180 * SCALE, gz.y + 140 * SCALE);
    ctx.lineTo(pouchX + 220 * SCALE, gz.y + 110 * SCALE);
    ctx.lineTo(pouchX + 280 * SCALE, gz.y + gz.h);
    ctx.closePath();
    ctx.fill();
  });
  fi(ART_NUTRITION_BG, () => ctx.fillRect(pouchX + nz.x, nz.y, nz.w, nz.h));
  fi(ART_BROWN_TEXT,   () => {
    ctx.font = `${9 * SCALE}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO", pouchX + POUCH_W / 2, nz.y + 14 * SCALE);
  });
}

function drawProcessPlate(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  gain: number,
  density: number,
) {
  const pid = ch.id as ProcessId;
  const angle = (ch.screenAngle * Math.PI) / 180;
  const densityScale = Math.min(1.5, density / ch.targetDensity);
  const hz = ZONES[ZONE_HEADER];
  const gz = ZONES[ZONE_GRAPHIC];
  const fz = ZONES[ZONE_FLAVOR];
  const nz = ZONES[ZONE_NUTRITION];

  function dotsInPath(buildPath: () => void, spanW: number, spanH: number, cx: number, cy: number, art: ArtCmyk) {
    const coverage = art[pid] * densityScale;
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

  dotsInRect(ART_SKY_TOP, pouchX + gz.x, gz.y,             gz.w, gz.h / 2);
  dotsInRect(ART_SKY_BOT, pouchX + gz.x, gz.y + gz.h / 2, gz.w, gz.h / 2);

  dotsInPath(
    () => { ctx.arc(pouchX + POUCH_W / 2, gz.y + 50 * SCALE, 36 * SCALE, Math.PI, 0); ctx.closePath(); },
    72 * SCALE, 36 * SCALE,
    pouchX + POUCH_W / 2, gz.y + 50 * SCALE,
    ART_SUN,
  );
  dotsInPath(
    () => {
      ctx.moveTo(pouchX,               gz.y + gz.h);
      ctx.lineTo(pouchX +  60 * SCALE, gz.y + 100 * SCALE);
      ctx.lineTo(pouchX + 110 * SCALE, gz.y + 150 * SCALE);
      ctx.lineTo(pouchX + 140 * SCALE, gz.y +  90 * SCALE);
      ctx.lineTo(pouchX + 180 * SCALE, gz.y + 140 * SCALE);
      ctx.lineTo(pouchX + 220 * SCALE, gz.y + 110 * SCALE);
      ctx.lineTo(pouchX + 280 * SCALE, gz.y + gz.h);
      ctx.closePath();
    },
    POUCH_W, gz.h,
    pouchX + POUCH_W / 2, gz.y + gz.h * 0.7,
    ART_MOUNTAIN,
  );

  dotsInRect(ART_NUTRITION_BG, pouchX + nz.x, nz.y, nz.w, nz.h);

  const txtA = Math.min(1, ART_BROWN_TEXT[pid] * densityScale);
  if (txtA >= 0.005) {
    ctx.save(); ctx.globalAlpha = txtA;
    ctx.font = `${9 * SCALE}px Inter, sans-serif`; ctx.textAlign = "center";
    ctx.fillText("NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO", pouchX + POUCH_W / 2, nz.y + 14 * SCALE);
    ctx.restore();
  }
}

function drawSpotArtwork(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  density: number,
) {
  const alpha = Math.min(1, Math.max(MIN_PLATE_ALPHA, density / ch.targetDensity));
  ctx.globalAlpha = alpha;
  for (const zone of ch.artworkZones) {
    if (zone.type === "rect") {
      ctx.fillRect(pouchX + zone.x, zone.y, zone.w, zone.h);
    } else if (zone.type === "polygon") {
      ctx.beginPath();
      const [[fx, fy], ...rest] = zone.points;
      ctx.moveTo(pouchX + fx, fy);
      for (const [px, py] of rest) ctx.lineTo(pouchX + px, py);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSpotPlate(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  gain: number,
  density: number,
) {
  const angle = (ch.screenAngle * Math.PI) / 180;
  const coverage = Math.min(1.5, density / ch.targetDensity);
  const radius = PITCH * 0.48 * Math.sqrt(Math.max(0, coverage)) * (1 + gain * 1.5);
  if (radius < 0.5) return;

  for (const zone of ch.artworkZones) {
    if (zone.type !== "rect") continue;
    const rx = pouchX + zone.x;
    const ry = zone.y;
    const rw = zone.w;
    const rh = zone.h;
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const span = Math.ceil(Math.hypot(rw, rh) / 2) + PITCH;
    for (let dx = -span; dx <= span; dx += PITCH) {
      for (let dy = -span; dy <= span; dy += PITCH) {
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export function drawSnackPouchChannel(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  pouchX: number,
  regX: number,
  regY: number,
  density: number,
  gain: number,
  showDots: boolean,
): void {
  const baseAlpha = Math.min(1, Math.max(MIN_PLATE_ALPHA, density));

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = ch.displayColor;
  ctx.globalAlpha = showDots ? baseAlpha : 1;

  ctx.save();
  const bleed = (ch.isProcess ? 2 : 0) * MIL_TO_PX;
  ctx.beginPath();
  ctx.rect(pouchX - bleed, POUCH_TOP - bleed, POUCH_W + bleed * 2, POUCH_H + bleed * 2);
  ctx.clip();
  ctx.translate(regX, regY);

  if (ch.isProcess) {
    if (showDots) {
      drawProcessPlate(ctx, ch, pouchX, gain, density);
    } else {
      drawProcessArtwork(ctx, ch, pouchX, density);
    }
  } else {
    if (showDots) {
      drawSpotPlate(ctx, ch, pouchX, gain, density);
    } else {
      drawSpotArtwork(ctx, ch, pouchX, density);
    }
  }

  applyTextKnockout(ctx, pouchX);

  ctx.restore();
  ctx.restore();
}
