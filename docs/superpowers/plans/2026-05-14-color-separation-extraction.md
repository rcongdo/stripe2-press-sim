# Color Separation Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OCG-layer-based PDF extraction with Separation color space extraction so users map actual ink colorant names to press channels instead of document layer names.

**Architecture:** `pdf-lib` parses the first page's `Resources/ColorSpace` dictionary to enumerate Separation colorant names; for each colorant the PDF is rewritten in-memory (other colorants' tint functions zeroed out) and rendered by `pdfjs-dist` to produce a per-channel `ImageBitmap`. The `ExtractedLayers` return type is unchanged, so everything downstream (`autoMapper`, `buildCustomJob`, `PdfUploadModal`, `PrintPreview`) requires only import-name swaps.

**Tech Stack:** `pdf-lib` ^1.17 (PDF structure parsing + in-memory rewrite), `pdfjs-dist` ^5.6 (rendering, already installed), OffscreenCanvas / `createImageBitmap` (browser, already used).

**Node/npm:** This project lives under `~/Documents/Codex/` and uses a non-standard runtime.  
- node: `/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`  
- npm: `<node> /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm`  
(Abbreviated as `$NODE` and `$NPM` in commands below.)

---

## File map

| Path | Action |
|------|--------|
| `src/pdf/extractLayers.ts` | **Delete** |
| `src/pdf/extractSeparations.ts` | **Create** |
| `src/pdf/autoMapper.ts` | **Modify** — rename two exports |
| `src/pdf/autoMapper.test.ts` | **Modify** — update import names |
| `src/components/PdfUploadModal.tsx` | **Modify** — swap imports + update UI copy |
| `src/components/PdfUploadModal.test.tsx` | **Modify** — swap mock |
| `src/App.test.tsx` | **Modify** — swap mock |
| `package.json` / `package-lock.json` | **Modify** — add `pdf-lib` |

---

### Task 1: Install pdf-lib

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the package**

```bash
NODE=/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
NPM="$NODE /Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm"

cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic
$NPM install pdf-lib
```

Expected: `added N packages` with no errors. `pdf-lib` appears in `dependencies` (not devDependencies) in `package.json`.

- [ ] **Step 2: Verify TypeScript can resolve pdf-lib types**

```bash
$NODE node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Expected: zero errors. `pdf-lib` ships its own `.d.ts` files — no `@types/pdf-lib` is needed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdf-lib dependency"
```

---

### Task 2: Rename autoMapper exports

The mapper logic is unchanged — only the exported function names become more accurate now that the strings come from color separation names rather than OCG layer names.

**Files:**
- Modify: `src/pdf/autoMapper.ts`
- Modify: `src/pdf/autoMapper.test.ts`

- [ ] **Step 1: Update the test file first (TDD — tests will fail)**

Replace the entire contents of `src/pdf/autoMapper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { autoMapColorants, mapColorantNameToChannelId } from "./autoMapper";

describe("mapColorantNameToChannelId", () => {
  it.each([
    ["C",        "C"],
    ["Cyan",     "C"],
    ["cyan",     "C"],
    ["M",        "M"],
    ["Magenta",  "M"],
    ["magenta",  "M"],
    ["Y",        "Y"],
    ["Yellow",   "Y"],
    ["yellow",   "Y"],
    ["K",        "K"],
    ["Black",    "K"],
    ["black",    "K"],
    ["Key",      "K"],
    ["key",      "K"],
    ["orange",   "orange"],
    ["Orange",   "orange"],
    ["silver",   "silver"],
    ["Silver",   "silver"],
    ["metallic", "silver"],
    ["Metallic", "silver"],
    ["white",    "white"],
    ["White",    "white"],
    ["opaque",   "white"],
    ["Opaque white", "white"],
  ])('maps "%s" → "%s"', (input, expected) => {
    expect(mapColorantNameToChannelId(input)).toBe(expected);
  });

  it('returns "ignore" for unrecognised names', () => {
    expect(mapColorantNameToChannelId("Spot UV")).toBe("ignore");
    expect(mapColorantNameToChannelId("PANTONE 485 C")).toBe("ignore");
    expect(mapColorantNameToChannelId("")).toBe("ignore");
  });
});

describe("autoMapColorants", () => {
  it("maps an array of colorant names to a channel-id record", () => {
    const result = autoMapColorants(["Cyan", "Magenta", "Yellow", "Black", "Spot UV"]);
    expect(result).toEqual({
      Cyan:     "C",
      Magenta:  "M",
      Yellow:   "Y",
      Black:    "K",
      "Spot UV": "ignore",
    });
  });

  it("returns an empty object for an empty array", () => {
    expect(autoMapColorants([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
NODE=/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
$NODE node_modules/.bin/vitest run src/pdf/autoMapper.test.ts
```

Expected: FAIL — `autoMapColorants` and `mapColorantNameToChannelId` are not exported.

- [ ] **Step 3: Update autoMapper.ts to use the new export names**

Replace the entire contents of `src/pdf/autoMapper.ts`:

```ts
import type { ChannelId } from "../domain/types";

export function mapColorantNameToChannelId(name: string): ChannelId | "ignore" {
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

export function autoMapColorants(
  colorantNames: string[],
): Record<string, ChannelId | "ignore"> {
  return Object.fromEntries(
    colorantNames.map(name => [name, mapColorantNameToChannelId(name)]),
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
$NODE node_modules/.bin/vitest run src/pdf/autoMapper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pdf/autoMapper.ts src/pdf/autoMapper.test.ts
git commit -m "refactor: rename autoMapper exports to mapColorantName / autoMapColorants"
```

---

### Task 3: Create extractSeparations.ts

This module uses `pdf-lib` to enumerate Separation colorant names, then for each colorant rewrites the PDF in-memory (all other Separations clamped to white) and renders it with `pdfjs-dist`. No unit test — the function requires a real PDF file and browser rendering APIs unavailable in the vitest/jsdom environment.

**Files:**
- Create: `src/pdf/extractSeparations.ts`
- Delete: `src/pdf/extractLayers.ts`

- [ ] **Step 1: Create src/pdf/extractSeparations.ts**

```ts
import * as pdfjsLib from "pdfjs-dist";
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

const TARGET_W = 1120;
const TARGET_H = 1600;

export type ExtractedLayers = {
  names: string[];
  images: Record<string, ImageBitmap>;
};

export async function extractSeparations(file: File): Promise<ExtractedLayers> {
  const buffer = await file.arrayBuffer();
  const colorantNames = await parseColorantNames(buffer);

  if (colorantNames.length === 0) {
    throw new Error(
      "No color separations found. This PDF must use Separation or DeviceN color spaces.",
    );
  }

  const images: Record<string, ImageBitmap> = {};
  for (const name of colorantNames) {
    try {
      const modifiedBytes = await rewriteTintFunctions(buffer, name);
      images[name] = await renderFirstPage(modifiedBytes);
    } catch (e) {
      console.warn(`Failed to render colorant "${name}":`, e);
    }
  }

  return { names: colorantNames, images };
}

async function parseColorantNames(buffer: ArrayBuffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(buffer);
  const page = pdfDoc.getPage(0);
  const resources = page.node.Resources();
  if (!resources) return [];

  const colorSpaceDict = resources.lookupMaybe(PDFName.of("ColorSpace"), PDFDict);
  if (!colorSpaceDict) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const [, value] of colorSpaceDict.entries()) {
    const csArray = pdfDoc.context.lookupMaybe(value, PDFArray);
    if (!csArray) continue;

    const csType = csArray.lookupMaybe(0, PDFName);
    if (csType?.encodedName !== "/Separation") continue;

    const inkNamePdf = csArray.lookupMaybe(1, PDFName);
    if (!inkNamePdf) continue;

    const name = decodeColorantName(inkNamePdf.encodedName.slice(1));
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

async function rewriteTintFunctions(
  buffer: ArrayBuffer,
  targetColorant: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer);
  const page = pdfDoc.getPage(0);
  const resources = page.node.Resources();
  const colorSpaceDict = resources?.lookupMaybe(PDFName.of("ColorSpace"), PDFDict);
  if (!colorSpaceDict) return new Uint8Array(buffer);

  // tint → DeviceGray: 0=white (no ink), 1=black (full ink)
  const invertFn = pdfDoc.context.obj({
    FunctionType: 2,
    Domain: [0, 1],
    Range: [0, 1],
    C0: [1],
    C1: [0],
    N: 1,
  });

  // always white — this colorant is invisible in this pass
  const whiteFn = pdfDoc.context.obj({
    FunctionType: 2,
    Domain: [0, 1],
    Range: [0, 1],
    C0: [1],
    C1: [1],
    N: 1,
  });

  for (const [key, value] of colorSpaceDict.entries()) {
    const csArray = pdfDoc.context.lookupMaybe(value, PDFArray);
    if (!csArray) continue;

    const csType = csArray.lookupMaybe(0, PDFName);
    if (csType?.encodedName !== "/Separation") continue;

    const inkNamePdf = csArray.lookupMaybe(1, PDFName);
    if (!inkNamePdf) continue;

    const name = decodeColorantName(inkNamePdf.encodedName.slice(1));

    const newCs = pdfDoc.context.obj([
      PDFName.of("Separation"),
      inkNamePdf,
      PDFName.of("DeviceGray"),
      name === targetColorant ? invertFn : whiteFn,
    ]);

    colorSpaceDict.set(key, newCs);
  }

  return pdfDoc.save();
}

async function renderFirstPage(bytes: Uint8Array): Promise<ImageBitmap> {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_W / viewport.width, TARGET_H / viewport.height);
    const scaled = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(
      Math.round(scaled.width),
      Math.round(scaled.height),
    );
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

    await page.render({
      canvas:        null,
      canvasContext: ctx,
      viewport:      scaled,
    }).promise;

    return createImageBitmap(canvas);
  } finally {
    await pdf.destroy();
  }
}

function decodeColorantName(encoded: string): string {
  return encoded.replace(
    /#([0-9A-Fa-f]{2})/g,
    (_, h) => String.fromCharCode(parseInt(h, 16)),
  );
}
```

- [ ] **Step 2: Delete extractLayers.ts**

```bash
rm src/pdf/extractLayers.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
NODE=/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
$NODE node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Expected: zero errors. If there are missing-module errors related to `extractLayers`, they will be fixed in Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/pdf/extractSeparations.ts
git rm src/pdf/extractLayers.ts
git commit -m "feat: add extractSeparations — replace OCG extraction with Separation color space extraction"
```

---

### Task 4: Wire up PdfUploadModal and clean up mocks

Swap all remaining references from `extractLayers` / `autoMapLayers` to `extractSeparations` / `autoMapColorants`, update the modal's UI copy, and verify all tests pass.

**Files:**
- Modify: `src/components/PdfUploadModal.test.tsx`
- Modify: `src/components/PdfUploadModal.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update PdfUploadModal.test.tsx (TDD — will fail until modal is updated)**

Replace the entire contents of `src/components/PdfUploadModal.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfUploadModal } from "./PdfUploadModal";

vi.mock("../pdf/extractSeparations", () => ({
  extractSeparations: vi.fn(),
}));

import { extractSeparations } from "../pdf/extractSeparations";
const mockExtractSeparations = vi.mocked(extractSeparations);

describe("PdfUploadModal", () => {
  const onConfirm = vi.fn();
  const onCancel  = vi.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onCancel.mockClear();
    mockExtractSeparations.mockClear();
  });

  it("renders file pick step initially", () => {
    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByTestId("pdf-file-input")).toBeInTheDocument();
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("transitions to mapping step after file selection", async () => {
    mockExtractSeparations.mockResolvedValue({
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
    mockExtractSeparations.mockResolvedValue({
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

  it("shows an error alert when extractSeparations rejects", async () => {
    mockExtractSeparations.mockRejectedValue(new Error("No color separations found"));

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["bad"], "bad.pdf", { type: "application/pdf" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No color separations found")
    );
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("disables Confirm when all rows are mapped to ignore", async () => {
    mockExtractSeparations.mockResolvedValue({
      names:  ["Spot UV"],
      images: { "Spot UV": {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["pdf"], "spot.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => screen.getByTestId("confirm-mapping"));
    expect(screen.getByTestId("confirm-mapping")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run modal tests — expect failure**

```bash
NODE=/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
$NODE node_modules/.bin/vitest run src/components/PdfUploadModal.test.tsx
```

Expected: FAIL — the modal still imports from `extractLayers` (deleted) and `autoMapLayers` (renamed).

- [ ] **Step 3: Update PdfUploadModal.tsx**

Replace the entire contents of `src/components/PdfUploadModal.tsx`:

```tsx
import { useRef, useState } from "react";
import type { ChannelId } from "../domain/types";
import type { CustomPdfJob } from "../domain/types";
import { autoMapColorants } from "../pdf/autoMapper";
import { buildCustomJob } from "../pdf/buildCustomJob";
import { extractSeparations } from "../pdf/extractSeparations";

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
      const { names, images } = await extractSeparations(file);
      imagesRef.current = images;
      const mapping = autoMapColorants(names);
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
            <p>Select a PDF with color separations (one Separation color space per ink channel).</p>
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
              Map each color separation to an ink channel. Separations set to <em>Ignore</em> will not be printed.
            </p>
            <table className="layer-map-table" data-testid="layer-map-table">
              <thead>
                <tr>
                  <th>Separation</th>
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

- [ ] **Step 4: Update App.test.tsx mock**

Open `src/App.test.tsx`. Find these lines near the top:

```ts
vi.mock("./pdf/extractLayers", () => ({
  extractLayers: vi.fn(),
}));
```

Replace them with:

```ts
vi.mock("./pdf/extractSeparations", () => ({
  extractSeparations: vi.fn(),
}));
```

- [ ] **Step 5: Run all tests — expect pass**

```bash
NODE=/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
$NODE node_modules/.bin/vitest run
```

Expected: all tests PASS. Count should be the same as before (104+).

- [ ] **Step 6: TypeScript check**

```bash
$NODE node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/PdfUploadModal.tsx \
        src/components/PdfUploadModal.test.tsx \
        src/App.test.tsx
git commit -m "feat: wire extractSeparations into PdfUploadModal, swap all extractLayers references"
```

---

## After all tasks

Push to origin/main to trigger the GitHub Pages deployment:

```bash
git push origin main
```
