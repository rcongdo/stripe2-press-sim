# PDF Upload Artwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload a color-separated PDF with OCG layers as custom press artwork, auto-mapping layers to ink channels with an editable review step.

**Architecture:** PDF.js extracts OCG layer names and rasterizes each layer to an `ImageBitmap` stored in session state. A `CustomPdfJob` wraps a standard `JobPreset` with the layer images, flowing through the existing `simulatePress` engine unchanged. `PrintPreview` detects a custom job via a type guard and uses a closure-based draw function instead of the hardcoded renderer map.

**Tech Stack:** React 19, TypeScript, Vite, pdfjs-dist 4.x, vitest + @testing-library/react

---

## File Structure

**New files:**
- `src/pdf/autoMapper.ts` — pure function: layer name string → channel ID or "ignore"
- `src/pdf/autoMapper.test.ts` — unit tests for the mapper
- `src/pdf/buildCustomJob.ts` — builds `CustomPdfJob` from layer mapping + base preset
- `src/pdf/buildCustomJob.test.ts` — unit tests for the builder
- `src/pdf/extractLayers.ts` — wraps PDF.js: `File → { names, images }`
- `src/components/PdfUploadModal.tsx` — two-step modal: file pick → layer mapping
- `src/components/PdfUploadModal.test.tsx` — integration tests (mocks `extractLayers`)
- `src/components/artwork/pdfArtwork.ts` — `createPdfDrawChannel(images)` factory

**Modified files:**
- `src/domain/types.ts` — add `LayerImages`, `CustomPdfJob`
- `src/components/PrintPreview.tsx` — detect `CustomPdfJob`, use `createPdfDrawChannel`
- `src/App.tsx` — `customJob` state, "Custom PDF…" select option, `PdfUploadModal`
- `src/styles.css` — modal styles
- `package.json` — add `pdfjs-dist`

---

## Task 1: Add `LayerImages` and `CustomPdfJob` types

**Files:**
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Add the two new types at the bottom of `src/domain/types.ts`**

```ts
export type LayerImages = Record<string, ImageBitmap>;

export type CustomPdfJob = JobPreset & {
  customPdf: {
    filename: string;
    layerImages: LayerImages;
  };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add LayerImages and CustomPdfJob types"
```

---

## Task 2: Auto-mapper module

**Files:**
- Create: `src/pdf/autoMapper.ts`
- Create: `src/pdf/autoMapper.test.ts`

- [ ] **Step 1: Write the failing tests in `src/pdf/autoMapper.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { autoMapLayers, mapLayerNameToChannelId } from "./autoMapper";

describe("mapLayerNameToChannelId", () => {
  it.each([
    ["Cyan",                "C"],
    ["CYAN",                "C"],
    ["c",                   "C"],
    ["C",                   "C"],
    ["Magenta",             "M"],
    ["m",                   "M"],
    ["Yellow",              "Y"],
    ["y",                   "Y"],
    ["Black",               "K"],
    ["key",                 "K"],
    ["k",                   "K"],
    ["CMYK Black",          "K"],
    ["Pantone 021 Orange",  "orange"],
    ["Metallic Silver",     "silver"],
    ["silver",              "silver"],
    ["Opaque White",        "white"],
    ["white",               "white"],
    ["Spot UV",             "ignore"],
    ["Logo",                "ignore"],
    ["",                    "ignore"],
  ])('maps "%s" to "%s"', (name, expected) => {
    expect(mapLayerNameToChannelId(name)).toBe(expected);
  });
});

describe("autoMapLayers", () => {
  it("maps a list of layer names to channel IDs", () => {
    const result = autoMapLayers(["Cyan", "Magenta", "Yellow", "Black", "Spot UV"]);
    expect(result).toEqual({
      Cyan: "C",
      Magenta: "M",
      Yellow: "Y",
      Black: "K",
      "Spot UV": "ignore",
    });
  });

  it("returns empty object for empty input", () => {
    expect(autoMapLayers([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pdf/autoMapper.test.ts`
Expected: FAIL with "Cannot find module './autoMapper'"

- [ ] **Step 3: Implement `src/pdf/autoMapper.ts`**

```ts
import type { ChannelId } from "../domain/types";

export function mapLayerNameToChannelId(name: string): ChannelId | "ignore" {
  const n = name.toLowerCase().trim();
  if (n === "c" || n.includes("cyan"))                        return "C";
  if (n === "m" || n.includes("magenta"))                     return "M";
  if (n === "y" || n.includes("yellow"))                      return "Y";
  if (n === "k" || n.includes("black") || n.includes("key")) return "K";
  if (n.includes("orange"))                                   return "orange";
  if (n.includes("silver") || n.includes("metallic"))        return "silver";
  if (n.includes("white") || n.includes("opaque"))           return "white";
  return "ignore";
}

export function autoMapLayers(
  layerNames: string[],
): Record<string, ChannelId | "ignore"> {
  return Object.fromEntries(
    layerNames.map(name => [name, mapLayerNameToChannelId(name)]),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pdf/autoMapper.test.ts`
Expected: PASS, all cases green

- [ ] **Step 5: Commit**

```bash
git add src/pdf/autoMapper.ts src/pdf/autoMapper.test.ts
git commit -m "feat: add OCG layer name auto-mapper"
```

---

## Task 3: `buildCustomJob` module

**Files:**
- Create: `src/pdf/buildCustomJob.ts`
- Create: `src/pdf/buildCustomJob.test.ts`

- [ ] **Step 1: Write the failing tests in `src/pdf/buildCustomJob.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildCustomJob } from "./buildCustomJob";

const mockImages = {
  Cyan:  {} as ImageBitmap,
  Black: {} as ImageBitmap,
};

describe("buildCustomJob", () => {
  it("builds a CustomPdfJob with correct id and name", () => {
    const job = buildCustomJob("test.pdf", { Cyan: "C", Black: "K" }, mockImages);
    expect(job.id).toBe("__custom__");
    expect(job.name).toBe("Custom: test.pdf");
    expect(job.customPdf.filename).toBe("test.pdf");
    expect(job.customPdf.layerImages).toBe(mockImages);
  });

  it("includes only non-ignored channels", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C", Spot: "ignore" }, mockImages);
    expect(job.channels).toHaveLength(1);
    expect(job.channels[0].id).toBe("C");
  });

  it("marks CMYK channels as process, others as not", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C", Orange: "orange" }, mockImages);
    const cyan   = job.channels.find(ch => ch.id === "C")!;
    const orange = job.channels.find(ch => ch.id === "orange")!;
    expect(cyan.isProcess).toBe(true);
    expect(orange.isProcess).toBe(false);
  });

  it("inherits ranges and target from snackPouchJob", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C" }, mockImages);
    expect(job.ranges.pressSpeed).toBeDefined();
    expect(job.target.density).toBeGreaterThan(0);
  });

  it("initializes all channels with default ink settings", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C", Black: "K" }, mockImages);
    expect(job.initialSettings.inkChannels["C"]).toEqual({
      aniloxVolume: 3.2,
      viscosity:    28,
      strength:     100,
      impression:   60,
    });
  });

  it("initializes registration offsets at zero for all channels", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C", Black: "K" }, mockImages);
    expect(job.initialSettings.registration["C"]).toEqual({ x: 0, y: 0 });
    expect(job.initialSettings.registration["K"]).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pdf/buildCustomJob.test.ts`
Expected: FAIL with "Cannot find module './buildCustomJob'"

- [ ] **Step 3: Implement `src/pdf/buildCustomJob.ts`**

```ts
import type { ChannelDef, ChannelId, InkChannelSettings, RegistrationOffset } from "../domain/types";
import type { CustomPdfJob, LayerImages } from "../domain/types";
import { snackPouchJob } from "../domain/jobs";

const CHANNEL_COLORS: Record<string, string> = {
  C: "#00bef0", M: "#e0009a", Y: "#c89400", K: "#222222",
  orange: "#ff6a00", silver: "#a8b4be", white: "#f0f0f0",
};

const SCREEN_ANGLES: Record<string, number> = {
  C: 15, M: 75, Y: 0, K: 45, orange: 30, silver: 60, white: 22,
};

const TARGET_DENSITIES: Record<string, number> = {
  C: 1.4, M: 1.4, Y: 1.0, K: 1.6, orange: 1.5, silver: 1.2, white: 0.9,
};

const PROCESS_IDS = new Set(["C", "M", "Y", "K"]);

const DEFAULT_INK: InkChannelSettings = {
  aniloxVolume: 3.2,
  viscosity:    28,
  strength:     100,
  impression:   60,
};

const ZERO_REG: RegistrationOffset = { x: 0, y: 0 };

export function buildCustomJob(
  filename: string,
  mapping: Record<string, ChannelId | "ignore">,
  layerImages: LayerImages,
): CustomPdfJob {
  const channels: ChannelDef[] = Object.entries(mapping)
    .filter(([, id]) => id !== "ignore")
    .map(([layerName, id]) => ({
      id:             id as ChannelId,
      name:           layerName,
      isProcess:      PROCESS_IDS.has(id as string),
      displayColor:   CHANNEL_COLORS[id as string] ?? "#888888",
      screenAngle:    SCREEN_ANGLES[id as string]  ?? 0,
      artworkZones:   [],
      initiallyActive: true,
      targetDensity:  TARGET_DENSITIES[id as string] ?? 1.3,
    }));

  const inkChannels: Record<ChannelId, InkChannelSettings> = {};
  const registration: Record<ChannelId, RegistrationOffset> = {};
  for (const ch of channels) {
    inkChannels[ch.id]   = { ...DEFAULT_INK };
    registration[ch.id]  = { ...ZERO_REG };
  }

  return {
    ...snackPouchJob,
    id:          "__custom__",
    name:        `Custom: ${filename}`,
    description: `Uploaded from ${filename}`,
    channels,
    initialSettings: {
      ...snackPouchJob.initialSettings,
      inkChannels,
      registration,
    },
    customPdf: { filename, layerImages },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pdf/buildCustomJob.test.ts`
Expected: PASS, all cases green

- [ ] **Step 5: Commit**

```bash
git add src/pdf/buildCustomJob.ts src/pdf/buildCustomJob.test.ts
git commit -m "feat: add buildCustomJob factory"
```

---

## Task 4: Install PDF.js and write `extractLayers`

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/pdf/extractLayers.ts`

> Note: `extractLayers` calls PDF.js and browser APIs (`createImageBitmap`, `OffscreenCanvas`) that cannot be unit tested in jsdom. The `PdfUploadModal` tests in Task 7 mock this module entirely. No unit tests for this file.

- [ ] **Step 1: Install pdfjs-dist**

```bash
npm install pdfjs-dist
```

Expected: `pdfjs-dist` appears in `package.json` dependencies, `node_modules/pdfjs-dist` exists.

- [ ] **Step 2: Create `src/pdf/extractLayers.ts`**

```ts
import * as pdfjsLib from "pdfjs-dist";
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { OptionalContentConfig, PDFPageProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

// Target dimensions match the PrintPreview canvas pouch size (SCALE=4, POUCH_W=280*4, POUCH_H=400*4)
const TARGET_W = 1120;
const TARGET_H = 1600;

export type ExtractedLayers = {
  names: string[];
  images: Record<string, ImageBitmap>;
};

export async function extractLayers(file: File): Promise<ExtractedLayers> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const optConfig = await pdf.getOptionalContentConfig();
  const groups = optConfig.getGroups();

  if (!groups || Object.keys(groups).length === 0) {
    const image = await renderLayer(page, optConfig, TARGET_W, TARGET_H);
    return { names: ["__merged__"], images: { __merged__: image } };
  }

  const groupIds = Object.keys(groups);
  const names: string[] = groupIds.map(id => (groups[id] as { name?: string }).name ?? id);
  const images: Record<string, ImageBitmap> = {};

  for (let i = 0; i < groupIds.length; i++) {
    const id   = groupIds[i];
    const name = names[i];
    for (const otherId of groupIds) optConfig.setVisibility(otherId, false);
    optConfig.setVisibility(id, true);
    images[name] = await renderLayer(page, optConfig, TARGET_W, TARGET_H);
  }

  return { names, images };
}

async function renderLayer(
  page: PDFPageProxy,
  optConfig: OptionalContentConfig,
  targetW: number,
  targetH: number,
): Promise<ImageBitmap> {
  const viewport = page.getViewport({ scale: 1 });
  const scale    = Math.min(targetW / viewport.width, targetH / viewport.height);
  const scaled   = page.getViewport({ scale });

  const canvas = new OffscreenCanvas(scaled.width, scaled.height);
  const ctx    = canvas.getContext("2d") as CanvasRenderingContext2D;

  await page.render({
    canvasContext: ctx,
    viewport:      scaled,
    optionalContentConfigPromise: Promise.resolve(optConfig),
  }).promise;

  return createImageBitmap(canvas);
}
```

- [ ] **Step 3: Verify TypeScript compiles (pdfjs-dist types are included with the package)**

Run: `npx tsc --noEmit`
Expected: no errors. If you see "Cannot find module 'pdfjs-dist/build/pdf.worker.min.mjs?url'", add a declaration in `src/test.d.ts`:

```ts
// Add to src/test.d.ts if needed
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pdf/extractLayers.ts src/test.d.ts package.json package-lock.json
git commit -m "feat: add PDF.js layer extraction utility"
```

---

## Task 5: PDF artwork renderer

**Files:**
- Create: `src/components/artwork/pdfArtwork.ts`

> This file has no unit tests — it's a pure canvas drawing function tested visually. The `PrintPreview` integration (Task 6) covers correctness at the component level.

- [ ] **Step 1: Create `src/components/artwork/pdfArtwork.ts`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/artwork/pdfArtwork.ts
git commit -m "feat: add PDF layer artwork renderer factory"
```

---

## Task 6: Wire `PrintPreview` to support custom jobs

**Files:**
- Modify: `src/components/PrintPreview.tsx`

The only change is at line ~175 where `drawChannel` is resolved. A type guard detects `CustomPdfJob` and uses the closure-based factory instead of the renderer map.

- [ ] **Step 1: Add imports at the top of `src/components/PrintPreview.tsx`**

After the existing imports, add:

```ts
import type { CustomPdfJob } from "../domain/types";
import { createPdfDrawChannel } from "./artwork/pdfArtwork";
```

- [ ] **Step 2: Add the type guard function after the `ARTWORK_RENDERERS` map**

Add this function after the closing `};` of the `ARTWORK_RENDERERS` object (around line 16):

```ts
function isCustomPdfJob(job: JobPreset): job is CustomPdfJob {
  return "customPdf" in job;
}
```

- [ ] **Step 3: Replace the `drawChannel` resolution inside the `useEffect` render (around line 175)**

Find:
```ts
const drawChannel = ARTWORK_RENDERERS[job.id] ?? drawLabelPrintChannel;
```

Replace with:
```ts
const drawChannel = isCustomPdfJob(job)
  ? createPdfDrawChannel(job.customPdf.layerImages)
  : (ARTWORK_RENDERERS[job.id] ?? drawLabelPrintChannel);
```

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: all existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/PrintPreview.tsx
git commit -m "feat: support CustomPdfJob in PrintPreview renderer"
```

---

## Task 7: `PdfUploadModal` tests

**Files:**
- Create: `src/components/PdfUploadModal.test.tsx`

Write the tests first — the component doesn't exist yet, so all tests will fail. `extractLayers` is mocked so the tests run without PDF.js.

- [ ] **Step 1: Write `src/components/PdfUploadModal.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfUploadModal } from "./PdfUploadModal";

vi.mock("../pdf/extractLayers", () => ({
  extractLayers: vi.fn(),
}));

import { extractLayers } from "../pdf/extractLayers";
const mockExtractLayers = vi.mocked(extractLayers);

describe("PdfUploadModal", () => {
  const onConfirm = vi.fn();
  const onCancel  = vi.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onCancel.mockClear();
    mockExtractLayers.mockClear();
  });

  it("renders file pick step initially", () => {
    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByTestId("pdf-file-input")).toBeInTheDocument();
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("transitions to mapping step after file selection", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Cyan", "Black"],
      images: { Cyan: {} as ImageBitmap, Black: {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    const input = screen.getByTestId("pdf-file-input");
    const file  = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByTestId("layer-map-table")).toBeInTheDocument()
    );
    expect(screen.getByText("Cyan")).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();
  });

  it("calls onConfirm with CustomPdfJob when confirmed", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Cyan", "Black"],
      images: { Cyan: {} as ImageBitmap, Black: {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["pdf"], "artwork.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => screen.getByTestId("confirm-mapping"));
    await userEvent.click(screen.getByTestId("confirm-mapping"));

    expect(onConfirm).toHaveBeenCalledOnce();
    const job = onConfirm.mock.calls[0][0];
    expect(job.customPdf.filename).toBe("artwork.pdf");
    expect(job.channels.some((ch: { id: string }) => ch.id === "C")).toBe(true);
  });

  it("calls onCancel when the × button is clicked", async () => {
    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows an error alert when extractLayers rejects", async () => {
    mockExtractLayers.mockRejectedValue(new Error("Invalid PDF"));

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["bad"], "bad.pdf", { type: "application/pdf" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid PDF")
    );
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("disables Confirm when all rows are mapped to ignore", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Spot UV"],
      images: { "Spot UV": {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["pdf"], "spot.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => screen.getByTestId("confirm-mapping"));
    // "Spot UV" auto-maps to "ignore" → button should be disabled
    expect(screen.getByTestId("confirm-mapping")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/PdfUploadModal.test.tsx`
Expected: FAIL with "Cannot find module './PdfUploadModal'"

---

## Task 8: `PdfUploadModal` component

**Files:**
- Create: `src/components/PdfUploadModal.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/PdfUploadModal.tsx`**

```tsx
import { useRef, useState } from "react";
import type { ChannelId } from "../domain/types";
import type { CustomPdfJob } from "../domain/types";
import { autoMapLayers } from "../pdf/autoMapper";
import { buildCustomJob } from "../pdf/buildCustomJob";
import { extractLayers } from "../pdf/extractLayers";

type LayerRow = { name: string; channelId: ChannelId | "ignore" };

type Props = {
  onConfirm: (job: CustomPdfJob) => void;
  onCancel:  () => void;
};

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "C",      label: "Cyan (C)" },
  { value: "M",      label: "Magenta (M)" },
  { value: "Y",      label: "Yellow (Y)" },
  { value: "K",      label: "Black (K)" },
  { value: "orange", label: "Orange" },
  { value: "silver", label: "Silver" },
  { value: "white",  label: "White" },
  { value: "ignore", label: "Ignore" },
];

export function PdfUploadModal({ onConfirm, onCancel }: Props) {
  const [step,     setStep]     = useState<"pick" | "map">("pick");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [rows,     setRows]     = useState<LayerRow[]>([]);
  const imagesRef = useRef<Record<string, ImageBitmap>>({});

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const { names, images } = await extractLayers(file);
      imagesRef.current = images;
      const mapping = autoMapLayers(names);
      setFilename(file.name);
      setRows(names.map(name => ({ name, channelId: mapping[name] })));
      setStep("map");
    } catch (e) {
      setError(`Failed to read PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleRowChange(index: number, channelId: ChannelId | "ignore") {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, channelId } : r));
  }

  function handleConfirm() {
    const mapping = Object.fromEntries(rows.map(r => [r.name, r.channelId]));
    onConfirm(buildCustomJob(filename, mapping, imagesRef.current));
  }

  const allIgnored = rows.every(r => r.channelId === "ignore");

  return (
    <div className="modal-backdrop" data-testid="pdf-upload-modal">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Upload PDF Artwork</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onCancel}>×</button>
        </div>

        {step === "pick" && (
          <div className="modal-body">
            <p>Select a color-separated PDF with OCG layers (one layer per ink channel).</p>
            {error && <p className="modal-error" role="alert">{error}</p>}
            {loading ? (
              <p className="modal-loading">Reading PDF…</p>
            ) : (
              <label className="file-drop-zone">
                <span>Drop PDF here or click to browse</span>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  data-testid="pdf-file-input"
                />
              </label>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="modal-body">
            <p>
              Map each PDF layer to an ink channel. Layers set to <em>Ignore</em> will not be printed.
            </p>
            <table className="layer-map-table" data-testid="layer-map-table">
              <thead>
                <tr>
                  <th>Layer name</th>
                  <th>Maps to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>
                      <select
                        value={row.channelId}
                        aria-label={`Channel for ${row.name}`}
                        onChange={e => handleRowChange(i, e.target.value as ChannelId | "ignore")}
                      >
                        {CHANNEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
              <button
                type="button"
                className="primary-button"
                disabled={allIgnored}
                onClick={handleConfirm}
                data-testid="confirm-mapping"
              >
                Apply artwork
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add modal styles to `src/styles.css`**

Append to the end of `src/styles.css`:

```css
/* ── PDF Upload Modal ─────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid #e8edf1;
}

.modal-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: #697784;
  padding: 0 0.2rem;
}

.modal-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
}

.modal-error {
  color: #c0392b;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}

.modal-loading {
  color: #697784;
  font-size: 0.9rem;
}

.file-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #b0bec5;
  border-radius: 8px;
  padding: 2rem;
  cursor: pointer;
  color: #455a64;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.file-drop-zone:hover {
  border-color: #1976d2;
  color: #1976d2;
}

.layer-map-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.layer-map-table th,
.layer-map-table td {
  padding: 0.4rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e8edf1;
}

.layer-map-table th {
  font-weight: 600;
  color: #455a64;
}

.layer-map-table select {
  font-size: 0.85rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
}
```

- [ ] **Step 3: Run the PdfUploadModal tests**

Run: `npx vitest run src/components/PdfUploadModal.test.tsx`
Expected: all 6 tests pass

- [ ] **Step 4: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/PdfUploadModal.tsx src/components/PdfUploadModal.test.tsx src/styles.css
git commit -m "feat: add PdfUploadModal component"
```

---

## Task 9: Wire `App.tsx`

**Files:**
- Modify: `src/App.tsx`

This task adds `customJob` state, a "Custom PDF…" job selector option, and mounts `PdfUploadModal` conditionally. Every reference to `selectedJob` in the render becomes `activeJob`.

- [ ] **Step 1: Add imports to `src/App.tsx`**

Add to the existing import block:

```ts
import type { CustomPdfJob } from "./domain/types";
import { PdfUploadModal } from "./components/PdfUploadModal";
```

- [ ] **Step 2: Add state and derive `activeJob` inside `App()`**

After the existing `useState` declarations (around line 35), add:

```ts
const [customJob,      setCustomJob]      = useState<CustomPdfJob | null>(null);
const [showPdfUpload,  setShowPdfUpload]  = useState(false);

const activeJob = customJob ?? selectedJob;
```

- [ ] **Step 3: Update all `selectedJob` references in the render to `activeJob`**

In `App.tsx`, every usage of `selectedJob` that feeds into `simulatePress`, `MetricsStrip`, `PrintPreview`, `PressModel`, and `ControlPanel` must become `activeJob`. The places to change (the `useState` setter and `switchJob` function body still use `selectedJob` internally — only template references change):

Line ~37: `const outcome = useMemo(() => simulatePress(selectedJob, settings), [selectedJob, settings]);`
→ `const outcome = useMemo(() => simulatePress(activeJob, settings), [activeJob, settings]);`

Line ~105: `<MetricsStrip job={selectedJob} ...`
→ `<MetricsStrip job={activeJob} ...`

Line ~132: `<PrintPreview settings={settings} outcome={outcome} job={selectedJob} />`
→ `<PrintPreview settings={settings} outcome={outcome} job={activeJob} />`

Line ~134: `<PressModel job={selectedJob} ...`
→ `<PressModel job={activeJob} ...`

Line ~144: `<ControlPanel job={selectedJob} ...`
→ `<ControlPanel job={activeJob} ...`

- [ ] **Step 4: Clear `customJob` when switching to a preset job**

Update `switchJob` to clear the custom job:

```ts
function switchJob(job: JobPreset) {
  setSelectedJob(job);
  setCustomJob(null);
  setSettings(createInitialSettings(job));
  setScore(null);
  setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
}
```

- [ ] **Step 5: Replace the `<select>` in the header**

Find the `<select className="job-selector" ...>` block and replace it with:

```tsx
<select
  className="job-selector"
  value={customJob ? "__custom__" : selectedJob.id}
  aria-label="Select job"
  onChange={e => {
    if (e.target.value === "__custom__") {
      setShowPdfUpload(true);
    } else {
      const job = JOB_REGISTRY.find(j => j.id === e.target.value);
      if (job) switchJob(job);
    }
  }}
>
  {JOB_REGISTRY.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
  <option value="__custom__">
    {customJob ? customJob.name : "Custom PDF…"}
  </option>
</select>
```

- [ ] **Step 6: Mount `PdfUploadModal` at the bottom of the JSX**

Inside `<main className="app-shell">`, just before the closing `</main>`, add:

```tsx
{showPdfUpload && (
  <PdfUploadModal
    onConfirm={job => {
      setCustomJob(job);
      setSettings(createInitialSettings(job));
      setScore(null);
      setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
      setShowPdfUpload(false);
    }}
    onCancel={() => setShowPdfUpload(false)}
  />
)}
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: all tests pass (App.test.tsx may need minor updates if it asserts on `selectedJob.id` — see note below)

> **Note:** `src/App.test.tsx` may assert things about the rendered job name. Open it and confirm no assertions break. If `App.test.tsx` uses `getByText("Snack Pouch Film")` or similar, those should still pass since `activeJob` defaults to `snackPouchJob`.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PDF upload modal into App"
```

---

## Self-review checklist (for the implementer — run before marking complete)

After Task 9, run these checks:

- [ ] `npx vitest run` — all green
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Open dev server (`npm run dev`), select "Custom PDF…" — modal opens
- [ ] Upload a layered PDF — mapping table appears with auto-filled dropdowns
- [ ] Click "Apply artwork" — job selector shows "Custom: <filename>"
- [ ] Printed Output tab shows the custom artwork layers
- [ ] Switching back to a preset job (Snack Pouch Film) clears the custom job and restores normal artwork
