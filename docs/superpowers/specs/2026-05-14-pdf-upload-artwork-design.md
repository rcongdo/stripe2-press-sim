# PDF Upload Artwork Design

## Goal

Allow users to upload a color-separated PDF (with OCG layers) as custom artwork for the press simulator. Layers are auto-mapped to ink channels with an editable review step before the job becomes active.

## Constraints

- Session-only: no persistence to localStorage or disk
- Single-page PDFs only; multi-page files use page 1
- Layer source: PDF OCG (Optional Content Groups) — one layer per channel
- UI entry point: "Custom PDF…" option in the job selector dropdown (Option A)
- PDF rendering: PDF.js (Mozilla), runs entirely client-side

---

## Architecture

PDF.js parses the uploaded file in the browser. For each OCG layer it rasterizes a 1120×1600 px image (matching the existing artwork canvas size) with only that layer visible. The images are keyed by channel ID and stored in React state for the session lifetime.

A `CustomPdfJob` extends the standard `JobPreset` shape with an extra `layerImages` map. The `ranges`, `target`, and `inkChannelRanges` fields are inherited from `snackPouchJob` as a structural base (sensible defaults for a general press setup). This flows through `App.tsx` alongside the normal job; the simulation engine (`simulatePress`) receives it as a plain `JobPreset` and requires no changes.

The artwork renderer is swapped: when a custom job is active, `PdfArtworkRenderer` is used instead of `snackPouch.ts`. It draws each channel's raster image with color tinting (multiply blend) and the same per-channel visibility logic the existing renderer uses.

---

## Components

### New: `PdfUploadModal`

Two-step modal triggered when user picks "Custom PDF…":

**Step 1 — File pick**
- `<input type="file" accept=".pdf">` inside a drop zone
- On selection, calls PDF.js to extract layer names and rasterize each layer
- Shows a spinner while processing

**Step 2 — Layer mapping review**
- Table: one row per detected layer
- Columns: Layer name (read-only) | Maps to channel (editable dropdown — all channel IDs + "Ignore")
- Auto-mapper pre-fills the dropdown (see Auto-mapping below)
- "Confirm" button replaces the active job; "Cancel" discards and closes

### New: `PdfArtworkRenderer`

Replaces `snackPouch.ts` functions for custom jobs. Accepts `layerImages: Record<string, ImageBitmap>` and a `visibleChannels` set. For each visible channel, draws its `ImageBitmap` onto the canvas with:
- `globalCompositeOperation = "multiply"` for color accuracy
- Channel color tint via a color-fill layer at low opacity before multiply pass

### Modified: `JobSelector`

Adds a "Custom PDF…" item at the bottom of the dropdown. Selecting it opens `PdfUploadModal` instead of switching jobs. Active custom job appears in the list as "Custom: <filename>" so it can be re-selected without re-uploading.

### Modified: `App.tsx`

- Adds `customJob: CustomPdfJob | null` state
- Passes `onCustomJobChange` to `JobSelector`
- When `customJob` is set, passes it to `PressModel` and `ControlPanel` in place of the selected preset
- Clears `customJob` when user switches to a preset job

### Unchanged

`ControlPanel`, `PressModel`, `StationDetail`, `MetricsStrip`, `simulatePress` — all receive the custom job's `channels` array as a standard `JobPreset`. No special casing needed.

---

## Data Flow

```
User picks .pdf
  → PDF.js extracts OCG layer names
  → PDF.js rasterizes each layer to ImageBitmap (1120×1600, layer-only visible)
  → Auto-mapper: fuzzy match layer names → channel IDs
  → Modal shows mapping table with auto-filled dropdowns
  → User edits if needed, clicks Confirm
  → App builds CustomPdfJob:
      { ...baseJobPreset, channels: mappedChannels, layerImages: { [channelId]: ImageBitmap } }
  → App sets customJob state → job selector shows "Custom: <filename>"
  → PdfArtworkRenderer draws layer images per channel
  → simulatePress runs with CustomPdfJob as plain JobPreset
```

---

## Auto-Mapping

Runs synchronously after layer extraction. For each layer name (lowercased, trimmed):

| Match condition | Maps to |
|---|---|
| contains "cyan" or equals "c" | C |
| contains "magenta" or equals "m" | M |
| contains "yellow" or equals "y" | Y |
| contains "black", "key", or equals "k" | K |
| contains "orange" | orange |
| contains "silver" or contains "metallic" | silver |
| contains "white" or contains "opaque" | white |
| no match | "ignore" |

Unmatched layers default to "ignore" in the dropdown. The user can override any mapping.

---

## Error Handling

| Condition | Behavior |
|---|---|
| Non-PDF file selected | Rejected by `accept=".pdf"` on the file input; no modal opens |
| PDF with no OCG layers | Step 2 shows warning: "No layers detected — this may be a flat file. Map the whole image to one channel?" with a single-row fallback |
| Layer rasterization fails | That channel's row shows a warning chip "Render failed"; maps to "ignore" by default |
| File > 50 MB | Warning banner in Step 1: "Large file — rendering may be slow." No hard block. |
| User cancels at any step | Modal closes, active job unchanged, memory freed |

---

## Types

```ts
// src/domain/types.ts additions
export type LayerImages = Record<string, ImageBitmap>;

export type CustomPdfJob = JobPreset & {
  customPdf: {
    filename: string;
    layerImages: LayerImages;
  };
};
```

---

## Testing

**Unit tests (`src/pdf/autoMapper.test.ts`)**
- Maps "Cyan", "CYAN", "c", "C" → C
- Maps "Black", "Key", "K" → K
- Maps unrecognized name → "ignore"
- Maps "Metallic Silver" → silver
- Handles empty layer list

**Unit tests (`src/pdf/buildCustomJob.test.ts`)**
- Builds valid `CustomPdfJob` from layer map + base preset (`snackPouchJob` used as structural base for ranges/targets)
- Inherits all ranges and targets from base preset
- Only includes mapped (non-ignored) channels

**Integration tests (`src/components/PdfUploadModal.test.tsx`)**
- Renders file pick step
- Transitions to mapping step after file processing (mock PDF.js)
- Confirm button calls `onConfirm` with built `CustomPdfJob`
- Cancel closes without calling `onConfirm`
- Shows fallback row when no layers detected

**Manual checks**
- Artwork canvas renders channel layer images with correct color tint
- Switching back to a preset job clears custom artwork
