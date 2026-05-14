# Color Separation Extraction Design

**Goal:** Replace OCG-layer-based PDF extraction with Separation color space extraction so users can map actual ink colorants — not document layers — to press channels.

**Architecture:** `pdf-lib` parses the PDF structure to enumerate `Separation` colorant names; for each colorant, an in-memory modified PDF is created and rendered by `pdfjs-dist` to produce a per-channel `ImageBitmap`. Everything runs in the browser; the rest of the pipeline (`autoMapper`, `buildCustomJob`, `PdfUploadModal`, `PrintPreview`) is unchanged except for one import swap.

**Tech Stack:** `pdf-lib` (PDF structure parsing + in-memory modification), `pdfjs-dist` (rendering, already in use), OffscreenCanvas/`createImageBitmap` (browser APIs, already in use).

---

## What changes

| File | Action |
|------|--------|
| `src/pdf/extractLayers.ts` | Delete |
| `src/pdf/extractSeparations.ts` | New |
| `src/pdf/autoMapper.ts` | Rename exports (`mapLayerName…` → `mapColorantName…`) |
| `src/components/PdfUploadModal.tsx` | Swap import |
| `src/components/PdfUploadModal.test.tsx` | Swap mock |

All other files (`buildCustomJob.ts`, `PrintPreview.tsx`, `App.tsx`, `types.ts`) are untouched.

---

## `extractSeparations.ts`

### Return type

Reuses the existing `ExtractedLayers` type (unchanged):

```ts
export type ExtractedLayers = {
  names: string[];
  images: Record<string, ImageBitmap>;
};
```

### Algorithm

```
extractSeparations(file: File): Promise<ExtractedLayers>

1. buffer = await file.arrayBuffer()
2. pdfDoc = await PDFDocument.load(buffer)           // pdf-lib
3. page   = pdfDoc.getPage(0)
4. Walk page Resources/ColorSpace dictionary:
     for each entry whose value is a PDFArray
       where array[0] === /Separation:
         colorantName = array[1] (PDFName, strip leading slash)
     collect unique colorantNames
5. If colorantNames is empty → throw USER_ERROR
6. For each colorantName:
     a. modifiedBytes = rewriteTintFunctions(buffer, colorantNames, colorantName)
     b. images[colorantName] = await renderFirstPage(modifiedBytes)
7. return { names: colorantNames, images }
```

### `rewriteTintFunctions(buffer, allColorants, targetColorant)`

Uses `pdf-lib` to create an in-memory copy of the PDF where:

- **Target colorant's** `Separation` array becomes:
  `[/Separation /InkName /DeviceGray <invert-fn>]`
  where invert-fn is a type-2 exponential function: domain `[0,1]`, C0 `[1]`, C1 `[0]`, N `1` (tint 0 → gray 1/white, tint 1 → gray 0/black).

- **All other `Separation` entries** become:
  `[/Separation /InkName /DeviceGray <white-fn>]`
  where white-fn is type-2: C0 `[1]`, C1 `[1]`, N `1` (always white, ink invisible).

Returns `Uint8Array` (modified PDF bytes).

### `renderFirstPage(bytes)`

Identical to the existing `renderLayer` helper in `extractLayers.ts`:
- `pdfjsLib.getDocument({ data: bytes }).promise`
- `pdf.getPage(1)`
- Render to `OffscreenCanvas` at `TARGET_W × TARGET_H` (1120 × 1600)
- `createImageBitmap(canvas)`
- `pdf.destroy()` in `finally`

### Error cases

| Condition | Behaviour |
|-----------|-----------|
| No `Separation` entries found | `throw new Error("No color separations found. This PDF must use Separation or DeviceN color spaces.")` |
| Individual colorant render fails | Log warning, skip that colorant, continue |
| Duplicate colorant names | Deduplicate before the render loop; last declaration wins |

DeviceN color spaces are out of scope. Flexographic artwork files conventionally declare each ink as its own `Separation`; DeviceN support can be added later if needed.

---

## `autoMapper.ts`

Logic is identical — the matching rules (cyan, magenta, yellow, black/key, orange, silver/metallic, white/opaque) apply equally well to colorant names like `"Cyan"`, `"PANTONE 485 C"`, `"White Ink"`. Only the export names change for clarity:

| Old export | New export |
|------------|------------|
| `mapLayerNameToChannelId` | `mapColorantNameToChannelId` |
| `autoMapLayers` | `autoMapColorants` |

`autoMapper.test.ts` needs no changes — the test cases remain valid.

---

## `PdfUploadModal.tsx`

One import line changes:

```ts
// before
import { extractLayers } from "../pdf/extractLayers";
// after
import { extractSeparations } from "../pdf/extractSeparations";
```

The call site changes to `extractSeparations(file)`. The returned shape is identical (`{ names, images }`), so no other edits are needed.

The existing error display path (`role="alert"`) already handles thrown errors from the extraction step, so the new user-facing error message appears automatically.

---

## `PdfUploadModal.test.tsx`

Swap the mock target:

```ts
// before
vi.mock("../pdf/extractLayers", () => ({ extractLayers: vi.fn() }));
// after
vi.mock("../pdf/extractSeparations", () => ({ extractSeparations: vi.fn() }));
```

All existing test assertions remain valid.

---

## Dependencies

Add `pdf-lib` to `dependencies` in `package.json`. It is a pure-JS, browser-compatible library with no native modules.

---

## Testing strategy

`extractSeparations` itself is not unit-tested (requires real PDF bytes and browser rendering APIs). Coverage comes from:

- `autoMapper.test.ts` — unchanged, exercises string matching logic
- `PdfUploadModal.test.tsx` — mocks `extractSeparations` at the module boundary, exercises the modal's full interaction flow
- Manual testing with a real multi-separation PDF

---

## Out of scope

- DeviceN color space support
- Progress reporting during multi-colorant extraction
- CMYK-only composite PDFs (no Separation entries)
- Keeping `extractLayers.ts` as a fallback for OCG-layer PDFs
