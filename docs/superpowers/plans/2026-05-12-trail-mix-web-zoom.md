# Trail Mix Web Layout & Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract halftone canvas with a 3-up "Summit Trail Mix Co." snack pouch web layout, then add zoom buttons (0.5×/1×/2×/4×) to the preview header so users can inspect halftone dot structure.

**Architecture:** All label artwork and CMYK halftone plates render in the same canvas 2D context. `drawArtwork(ctx, pouchX)` renders flat-color brand elements for one pouch column before CMYK plates are composited via `multiply`. Zone coordinates become per-pouch relative values; both functions loop across `POUCH_ORIGINS = [10, 310, 610]`. Zoom is CSS-only — the canvas pixel dimensions never change; only the element's CSS `width`/`height` scale, with `image-rendering: pixelated` at zoom > 1.

**Tech Stack:** React 19, TypeScript, Canvas 2D API, Vitest + Testing Library

---

### Task 1: 3-up web layout with Summit Trail Mix Co. brand artwork

**Files:**
- Modify: `src/components/PrintPreview.tsx` (full rewrite of constants, functions, and useEffect)
- Test: `src/components/PrintPreview.test.tsx` (existing tests must still pass — no new tests in this task)

**Context:** The current file has these key values: `W=920, H=420, PITCH=12, MIL_TO_PX=4, MIN_PLATE_ALPHA=0.25`. The existing ZONES span the full canvas width (x=20, w=880). We're replacing that with 3 per-pouch columns, each 280px wide, starting at x=10, 310, 610.

- [ ] **Step 1: Verify existing tests pass before touching anything**

Run:
```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm run test -- --run 2>&1 | tail -10
```
Expected: `25 passed` (or similar), 0 failed.

- [ ] **Step 2: Replace `src/components/PrintPreview.tsx` with the 3-up layout**

Write the complete file:

```tsx
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
const POUCH_ORIGINS = [10, 310, 610] as const;

type Zone = { x: number; y: number; w: number; h: number };

// Per-pouch zone coordinates — x is relative to each pouch's pouchX origin
const ZONES: Zone[] = [
  { x: 0, y: 10,  w: 280, h: 60  },  // header
  { x: 0, y: 70,  w: 280, h: 220 },  // product graphic
  { x: 0, y: 290, w: 280, h: 50  },  // flavor stripe
  { x: 0, y: 340, w: 280, h: 70  },  // nutrition bar
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

function drawArtwork(ctx: CanvasRenderingContext2D, pouchX: number) {
  const [headerZone, graphicZone, flavorZone, nutritionZone] = ZONES;

  // Pouch die-cut outline
  ctx.save();
  ctx.strokeStyle = "#d4c9b0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pouchX, 10, 280, 400, 8);
  ctx.stroke();
  ctx.restore();

  // Header — forest green background with brand name
  ctx.save();
  ctx.fillStyle = "#1a4a2e";
  ctx.fillRect(pouchX + headerZone.x, headerZone.y, headerZone.w, headerZone.h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Inter, sans-serif";
  ctx.fillText("SUMMIT", pouchX + 140, headerZone.y + 36);
  ctx.fillStyle = "#a8d4a8";
  ctx.font = "800 11px Inter, sans-serif";
  ctx.fillText("TRAIL MIX CO.", pouchX + 140, headerZone.y + 54);
  ctx.restore();

  // Product graphic — amber sky gradient + mountain polygon + sun arc
  ctx.save();
  const skyGrad = ctx.createLinearGradient(
    pouchX + graphicZone.x, graphicZone.y,
    pouchX + graphicZone.x, graphicZone.y + graphicZone.h,
  );
  skyGrad.addColorStop(0, "#e8a020");
  skyGrad.addColorStop(1, "#c05010");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(pouchX + graphicZone.x, graphicZone.y, graphicZone.w, graphicZone.h);

  // Sun
  ctx.beginPath();
  ctx.arc(pouchX + 140, graphicZone.y + 50, 36, Math.PI, 0);
  ctx.fillStyle = "#f0c040";
  ctx.fill();

  // Mountain silhouette
  ctx.beginPath();
  ctx.moveTo(pouchX,       graphicZone.y + graphicZone.h);
  ctx.lineTo(pouchX + 60,  graphicZone.y + 100);
  ctx.lineTo(pouchX + 110, graphicZone.y + 150);
  ctx.lineTo(pouchX + 140, graphicZone.y + 90);
  ctx.lineTo(pouchX + 180, graphicZone.y + 140);
  ctx.lineTo(pouchX + 220, graphicZone.y + 110);
  ctx.lineTo(pouchX + 280, graphicZone.y + graphicZone.h);
  ctx.closePath();
  ctx.fillStyle = "#3a2010";
  ctx.fill();
  ctx.restore();

  // Flavor stripe — amber band with product name
  ctx.save();
  ctx.fillStyle = "#d4780a";
  ctx.fillRect(pouchX + flavorZone.x, flavorZone.y, flavorZone.w, flavorZone.h);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ALPINE CLASSIC CRUNCH", pouchX + 140, flavorZone.y + 32);
  ctx.restore();

  // Nutrition bar — cream background with claims text
  ctx.save();
  ctx.fillStyle = "#f5f0e0";
  ctx.fillRect(pouchX + nutritionZone.x, nutritionZone.y, nutritionZone.w, nutritionZone.h);
  ctx.fillStyle = "#4a3a2a";
  ctx.font = "9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO",
    pouchX + 140,
    nutritionZone.y + 40,
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

  ZONES.forEach((zone, i) => {
    const coverage = coverages[i];
    if (coverage < 0.01) return;

    const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + (gain - 0.18) * 1.5);
    if (radius <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(pouchX + zone.x, zone.y, zone.w, zone.h);
    ctx.clip();

    const cx = pouchX + zone.x + zone.w / 2 + regX;
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
      ctx.roundRect(4, 4, W - 8, H - 8, 6);
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
          drawPlate(ctx, ch, pouchX, regX, regY, outcome.gain, outcome.density);
        }
      }

      // Pinhole defects — small white voids scattered across full web
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

      // Edge squash — dark smear at zone top/bottom edges, per pouch
      if (outcome.defects.edgeSquash > 0) {
        ctx.save();
        ctx.globalAlpha = (outcome.defects.edgeSquash / 100) * 0.35;
        for (const pouchX of POUCH_ORIGINS) {
          for (const zone of ZONES) {
            const topX = pouchX + zone.x + zone.w / 2;
            const topY = zone.y;
            const grTop = ctx.createRadialGradient(topX, topY, 0, topX, topY, 24);
            grTop.addColorStop(0, "rgba(10,6,2,0.8)");
            grTop.addColorStop(1, "rgba(10,6,2,0)");
            ctx.fillStyle = grTop;
            ctx.fillRect(topX - 24, topY - 24, 48, 48);

            const botY = zone.y + zone.h;
            const grBot = ctx.createRadialGradient(topX, botY, 0, topX, botY, 24);
            grBot.addColorStop(0, "rgba(10,6,2,0.8)");
            grBot.addColorStop(1, "rgba(10,6,2,0)");
            ctx.fillStyle = grBot;
            ctx.fillRect(topX - 24, botY - 24, 48, 48);
          }
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
```

- [ ] **Step 3: Run tests to verify existing tests still pass**

Run:
```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm run test -- --run 2>&1 | tail -10
```
Expected: all tests pass. The "draws substrate background on mount" test asserts `fillRect(0, 0, 920, 420)` — this still holds because the substrate fill is the first thing drawn and `W=920`, `H=420` are unchanged.

- [ ] **Step 4: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: 3-up Summit Trail Mix Co. web layout with brand artwork"
```

---

### Task 2: Zoom controls

**Files:**
- Modify: `src/components/PrintPreview.tsx` (add `useState`, `ZOOM_LEVELS`, zoom state, zoom JSX, update canvas style)
- Modify: `src/styles.css` (add `overflow: auto` to `.print-preview`, add `.zoom-controls`, `.zoom-btn`, `.zoom-label`)
- Test: `src/components/PrintPreview.test.tsx` (add zoom behavior tests)

**Context:** `ZOOM_LEVELS = [0.5, 1, 2, 4] as const`. Zoom state starts at `1`. Canvas CSS width = `W * zoom` = `920 * zoom`. At zoom > 1, `imageRendering: "pixelated"` is applied. Two buttons ("−" aria-label "Zoom out", "+" aria-label "Zoom in") and a label showing `{zoom}×` sit in `.print-preview__header`. Buttons are `disabled` at min/max zoom.

- [ ] **Step 1: Write failing zoom tests in `src/components/PrintPreview.test.tsx`**

Add `fireEvent` to the import at the top, then add these tests inside the existing `describe("PrintPreview", ...)` block, after the last existing test:

```tsx
// Add fireEvent to the existing import:
import { render, screen, fireEvent } from "@testing-library/react";

// Add these tests after the existing 3 tests:
it("defaults to 1× zoom with canvas CSS width of 920px", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "920px" });
  expect(screen.getByText("1×")).toBeInTheDocument();
});

it("steps to 2× when zoom in is clicked", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  fireEvent.click(screen.getByLabelText("Zoom in"));
  expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "1840px" });
  expect(screen.getByText("2×")).toBeInTheDocument();
});

it("steps to 0.5× when zoom out is clicked", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  fireEvent.click(screen.getByLabelText("Zoom out"));
  expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "460px" });
  expect(screen.getByText("0.5×")).toBeInTheDocument();
});

it("disables zoom out at minimum zoom (0.5×)", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  fireEvent.click(screen.getByLabelText("Zoom out"));
  expect(screen.getByLabelText("Zoom out")).toBeDisabled();
});

it("disables zoom in at maximum zoom (4×)", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  fireEvent.click(screen.getByLabelText("Zoom in")); // 2×
  fireEvent.click(screen.getByLabelText("Zoom in")); // 4×
  expect(screen.getByLabelText("Zoom in")).toBeDisabled();
});

it("applies pixelated image rendering at zoom > 1", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  fireEvent.click(screen.getByLabelText("Zoom in")); // 2×
  expect(screen.getByTestId("print-canvas")).toHaveStyle({ imageRendering: "pixelated" });
});

it("does not apply pixelated image rendering at 1× zoom", () => {
  render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
  const canvas = screen.getByTestId("print-canvas");
  expect(canvas.style.imageRendering).not.toBe("pixelated");
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run:
```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm run test -- --run 2>&1 | tail -15
```
Expected: 7 new tests fail (zoom buttons not found, style not matching). Existing tests still pass.

- [ ] **Step 3: Add zoom state and controls to `src/components/PrintPreview.tsx`**

Make these three edits to the file produced by Task 1:

**Edit 1** — Change the import line to add `useState`:
```tsx
import { useEffect, useRef, useState } from "react";
```

**Edit 2** — Add zoom constants after the `POUCH_ORIGINS` line (after `const POUCH_ORIGINS = [10, 310, 610] as const;`):
```tsx
const ZOOM_LEVELS = [0.5, 1, 2, 4] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];
```

**Edit 3** — Replace the component's `return` statement with the zoom-aware version. The only changes are: (a) add zoom state, (b) add zoom controls to the header, (c) update canvas `style` prop.

Replace:
```tsx
export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
```

With:
```tsx
export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const zoomIdx = ZOOM_LEVELS.indexOf(zoom);
```

Replace the entire `return (...)` block with:
```tsx
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
            onClick={() => setZoom(ZOOM_LEVELS[zoomIdx - 1])}
          >−</button>
          <span className="zoom-label">{zoom}×</span>
          <button
            type="button"
            className="secondary-button zoom-btn"
            aria-label="Zoom in"
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            onClick={() => setZoom(ZOOM_LEVELS[zoomIdx + 1])}
          >+</button>
        </div>
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: W * zoom,
          height: H * zoom,
          display: "block",
          imageRendering: zoom > 1 ? "pixelated" : "auto",
        }}
        aria-label="Simulated flexible packaging web"
        data-testid="print-canvas"
      />
    </section>
  );
}
```

- [ ] **Step 4: Add zoom CSS to `src/styles.css`**

Find the existing `.print-preview` rule:
```css
.print-preview {
  padding: 16px;
}
```

Replace it with:
```css
.print-preview {
  padding: 16px;
  overflow: auto;
}
```

Then append these rules at the end of `src/styles.css`:
```css
/* Zoom controls */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-btn {
  min-height: 32px;
  padding: 0 10px;
  font-size: 1.1rem;
  line-height: 1;
}

.zoom-label {
  min-width: 36px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #53616d;
}
```

- [ ] **Step 5: Run tests to verify all pass**

Run:
```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm run test -- --run 2>&1 | tail -10
```
Expected: all tests pass (32 total — 25 existing + 7 new zoom tests).

- [ ] **Step 6: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: zoom controls (0.5×/1×/2×/4×) for print preview"
```
