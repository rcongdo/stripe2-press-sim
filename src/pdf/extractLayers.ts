import * as pdfjsLib from "pdfjs-dist";
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFPageProxy } from "pdfjs-dist";
import type { OptionalContentConfig } from "pdfjs-dist/types/src/display/optional_content_config";

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

  // In pdfjs-dist v5, OptionalContentConfig is iterable, yielding [id, group] pairs
  const groupEntries: Array<[string, { name?: string }]> = [
    ...optConfig as Iterable<[string, { name?: string }]>,
  ];

  if (groupEntries.length === 0) {
    const image = await renderLayer(page, optConfig, TARGET_W, TARGET_H);
    return { names: ["__merged__"], images: { __merged__: image } };
  }

  const names: string[] = groupEntries.map(([id, group]) => group?.name ?? id);
  const images: Record<string, ImageBitmap> = {};

  for (let i = 0; i < groupEntries.length; i++) {
    const [id] = groupEntries[i];
    const name = names[i];
    // Hide all groups, then show only this one
    for (const [otherId] of groupEntries) optConfig.setVisibility(otherId, false);
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

  const canvas = new OffscreenCanvas(Math.round(scaled.width), Math.round(scaled.height));
  // OffscreenCanvasRenderingContext2D is compatible with pdfjs rendering;
  // cast via unknown to satisfy the CanvasRenderingContext2D type expected by RenderParameters.
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  await page.render({
    canvas:        null,
    canvasContext: ctx,
    viewport:      scaled,
    optionalContentConfigPromise: Promise.resolve(optConfig),
  }).promise;

  return createImageBitmap(canvas);
}
