# Trail Mix Web Layout & Zoom Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract halftone canvas with a realistic 3-up snack pouch web layout for "Summit Trail Mix Co.", and add zoom controls that let the user step between 0.5×, 1×, 2×, and 4× to inspect halftone dot structure.

**Architecture:** All label artwork and CMYK halftone plates render in the same canvas 2D context. A new `drawArtwork(ctx, pouchX)` function renders flat-color brand elements for one pouch column before the CMYK plates are applied via `multiply` compositing. Zone coordinates become per-pouch relative values; the drawing loop iterates across three pouch x-origins. Zoom is CSS-only (canvas pixel dimensions never change) — the canvas element's CSS `width`/`height` scale by the zoom factor, with `image-rendering: pixelated` at zoom > 1.

**Tech Stack:** React 19, TypeScript, Canvas 2D API, Vitest + Testing Library

---

## Brand Identity

**Company:** Summit Trail Mix Co.  
**Product:** Alpine Classic Crunch  
**Tagline:** "Made for the trail"

### Zone Colors & Content

| Zone | Background | Content |
|------|-----------|---------|
| Header (top ~60px) | Forest green `#1a4a2e` | "SUMMIT" in white bold caps; "TRAIL MIX CO." in light-green small caps |
| Product graphic (~220px) | Sky gradient `#e8a020` → `#c05010` with dark brown `#3a2010` mountain polygon and sun arc | Visual fills only — no text |
| Flavor stripe (~50px) | Warm amber `#d4780a` | "ALPINE CLASSIC CRUNCH" centered in white |
| Nutrition bar (~70px) | Cream `#f5f0e0` | "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO" in dark small text |

---

## Canvas Layout

Canvas internal resolution: **920 × 420 px** (unchanged).

### Pouch columns

| | x-origin | printable width |
|-|----------|----------------|
| Pouch 1 | 10 | 280 |
| Pouch 2 | 310 | 280 |
| Pouch 3 | 610 | 280 |

Outer margin: 10px left/right. Gutter between pouches: 20px.  
Each pouch: 280px wide × 400px tall (y=10 to y=410). Rounded-rect outline in `#d4c9b0` (light warm tone simulating die-cut edge).

### Per-pouch zones (x relative to pouchX)

```ts
const ZONES = [
  { x: 0, y: 10,  w: 280, h: 60  },  // header
  { x: 0, y: 70,  w: 280, h: 220 },  // product graphic
  { x: 0, y: 290, w: 280, h: 50  },  // flavor stripe
  { x: 0, y: 340, w: 280, h: 70  },  // nutrition bar
];
```

The three pouch x-origins (`POUCH_ORIGINS = [10, 310, 610]`) are iterated in both `drawArtwork` and `drawPlate`.

---

## Rendering Architecture

### Layer order (per frame)

1. **Substrate** — fill entire canvas `#f6f1e8`, rounded inner rect `#fffdf8`
2. **Artwork** — for each of 3 pouchX: `drawArtwork(ctx, pouchX)` (flat fills + text)
3. **CMYK plates** — for each of 3 pouchX, for each channel Y→M→C→K: `drawPlate(ctx, ch, pouchX + regX, regY, gain, density)`
4. **Defect overlays** — unchanged in structure; x-coordinates must span full 920px canvas (already use `% 800`/`% 860` modulo patterns)

### `drawArtwork(ctx, pouchX)`

Renders one pouch column of flat-color label art:
- Pouch outline: `ctx.roundRect(pouchX, 10, 280, 400, 8)`, stroke `#d4c9b0`
- Header fill: `#1a4a2e` rect; text "SUMMIT" (white, 28px bold) and "TRAIL MIX CO." (light `#a8d4a8`, 11px)
- Graphic: linear gradient sky fill; mountain polygon (dark brown `#3a2010`); sun arc (amber `#f0a020`)
- Flavor stripe fill: `#d4780a`; text "ALPINE CLASSIC CRUNCH" (white, 13px bold)
- Nutrition bar fill: `#f5f0e0`; text "NET WT 2.5 OZ (70g)  •  GLUTEN FREE  •  NON-GMO" (dark `#4a3a2a`, 9px)

### `drawPlate` changes

Add `pouchX: number` parameter. The zone clip rect and dot grid center shift by `pouchX`:
```ts
function drawPlate(ctx, channel, pouchX, regX, regY, gain, density)
```

The call site iterates `POUCH_ORIGINS` in the outer loop:
```ts
for (const pouchX of POUCH_ORIGINS) {
  for (const ch of ["Y", "M", "C", "K"] as const) {
    const regX = settings.registration[REG_KEYS[ch].x] * MIL_TO_PX;
    const regY = settings.registration[REG_KEYS[ch].y] * MIL_TO_PX;
    drawPlate(ctx, ch, pouchX, regX, regY, outcome.gain, outcome.density);
  }
}
```

---

## Zoom

### State

```ts
const ZOOM_LEVELS = [0.5, 1, 2, 4] as const;
type ZoomLevel = typeof ZOOM_LEVELS[number];
const [zoom, setZoom] = useState<ZoomLevel>(1);
```

### Canvas element

```tsx
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
/>
```

### Zoom controls (in `.print-preview__header`)

```tsx
<div className="zoom-controls">
  <button
    className="secondary-button zoom-btn"
    onClick={() => setZoom(ZOOM_LEVELS[ZOOM_LEVELS.indexOf(zoom) - 1])}
    disabled={zoom === ZOOM_LEVELS[0]}
    aria-label="Zoom out"
  >−</button>
  <span className="zoom-label">{zoom}×</span>
  <button
    className="secondary-button zoom-btn"
    onClick={() => setZoom(ZOOM_LEVELS[ZOOM_LEVELS.indexOf(zoom) + 1])}
    disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
    aria-label="Zoom in"
  >+</button>
</div>
```

### CSS additions

```css
.print-preview {
  overflow: auto;   /* add — allows scrolling when zoomed > 1× */
}

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

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/PrintPreview.tsx` | Redesign zones to per-pouch; add `POUCH_ORIGINS`; add `drawArtwork`; update `drawPlate` signature; add zoom state + JSX |
| `src/styles.css` | Add `overflow: auto` to `.print-preview`; add `.zoom-controls`, `.zoom-btn`, `.zoom-label` |
| `src/components/PrintPreview.test.tsx` | Add zoom button tests; update existing tests if needed |

No changes to: `App.tsx`, `ControlPanel.tsx`, `domain/`, `simulation/`, Playwright e2e spec.

---

## Tests

### Existing tests (verify still pass)
- Renders live print sample section
- Renders canvas element with `data-testid="print-canvas"`
- Shows setup quality percentage
- Canvas context available via vitest-canvas-mock
- Draws substrate background on mount (`fillRect(0, 0, 920, 420)`)

### New tests
- Default zoom is 1× (canvas CSS width = 920, zoom label = "1×")
- "+" button steps zoom from 1× to 2× (canvas CSS width = 1840, zoom label = "2×")
- "−" button steps zoom from 1× to 0.5× (canvas CSS width = 460, zoom label = "0.5×")
- "−" button is disabled at 0.5×
- "+" button is disabled at 4×
- At zoom > 1, canvas has `imageRendering: pixelated` style
- At zoom ≤ 1, canvas does not have `imageRendering: pixelated`
