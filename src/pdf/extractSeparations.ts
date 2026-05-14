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
    if (csType?.asString() !== "Separation") continue;

    const inkNamePdf = csArray.lookupMaybe(1, PDFName);
    if (!inkNamePdf) continue;

    const name = decodeColorantName(inkNamePdf.asString());
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
    if (csType?.asString() !== "Separation") continue;

    const inkNamePdf = csArray.lookupMaybe(1, PDFName);
    if (!inkNamePdf) continue;

    const name = decodeColorantName(inkNamePdf.asString());

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
