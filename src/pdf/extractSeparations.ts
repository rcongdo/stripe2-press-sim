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
  const { separationNames, hasCmyk } = await analyzeColorSpaces(buffer);

  const cmykNames = hasCmyk
    ? (["Cyan", "Magenta", "Yellow", "Black"] as string[]).filter(
        n => !separationNames.includes(n),
      )
    : [];

  const colorantNames = [...separationNames, ...cmykNames];
  if (colorantNames.length === 0) {
    throw new Error(
      "No color separations found. This PDF must declare inks as Separation color spaces.",
    );
  }

  const images: Record<string, ImageBitmap> = {};

  for (const name of separationNames) {
    try {
      const modifiedBytes = await rewriteTintFunctions(buffer, name);
      images[name] = await renderFirstPage(modifiedBytes);
    } catch (e) {
      console.warn(`Failed to render colorant "${name}":`, e);
    }
  }

  if (cmykNames.length > 0) {
    try {
      const cmykImages = await renderCmykChannels(buffer, cmykNames);
      Object.assign(images, cmykImages);
    } catch (e) {
      console.warn("Failed to render CMYK channels:", e);
    }
  }

  return { names: colorantNames, images };
}

type AnalysisResult = {
  separationNames: string[];
  hasCmyk: boolean;
};

// Resolve a PDF value (possibly a ref) and return it if it is an instance of T.
// Uses { prototype: T } instead of a constructor type because pdf-lib classes
// have private/protected constructors that TypeScript won't accept as `new()`.
function resolve<T>(
  pdfDoc: PDFDocument,
  ref: ReturnType<PDFDict["get"]>,
  Type: { prototype: T },
): T | undefined {
  if (!ref) return undefined;
  try {
    const obj = pdfDoc.context.lookup(ref);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (obj instanceof (Type as any)) ? (obj as T) : undefined;
  } catch {
    return undefined;
  }
}

async function analyzeColorSpaces(buffer: ArrayBuffer): Promise<AnalysisResult> {
  const pdfDoc = await PDFDocument.load(buffer);
  const page = pdfDoc.getPage(0);

  const seen = new Set<string>();
  const separationNames: string[] = [];
  let hasCmyk = false;

  let resources: PDFDict | undefined;
  try {
    resources = page.node.Resources();
  } catch {
    return { separationNames, hasCmyk };
  }
  if (!resources) return { separationNames, hasCmyk };

  // Collect Separation colorant names from the page ColorSpace dict
  const colorSpaceDict = resolve(pdfDoc, resources.get(PDFName.of("ColorSpace")), PDFDict);
  if (colorSpaceDict) {
    for (const [, value] of colorSpaceDict.entries()) {
      const csArray = resolve(pdfDoc, value, PDFArray);
      if (!csArray) continue;

      const el0 = resolve(pdfDoc, csArray.get(0), PDFName);
      if (el0?.asString() !== "/Separation") continue;

      const el1 = resolve(pdfDoc, csArray.get(1), PDFName);
      if (!el1) continue;

      const name = decodeColorantName(el1.asString().slice(1));
      if (!seen.has(name)) { seen.add(name); separationNames.push(name); }
    }
  }

  // Detect DeviceCMYK usage in image XObjects
  const xObjectDict = resolve(pdfDoc, resources.get(PDFName.of("XObject")), PDFDict);
  if (xObjectDict) {
    for (const [, ref] of xObjectDict.entries()) {
      const xObj = resolve(pdfDoc, ref, PDFDict);
      if (!xObj) continue;
      const csObj = resolve(pdfDoc, xObj.get(PDFName.of("ColorSpace")), PDFName);
      if (csObj?.asString() === "/DeviceCMYK") {
        hasCmyk = true;
        break;
      }
    }
  }

  return { separationNames, hasCmyk };
}

async function rewriteTintFunctions(
  buffer: ArrayBuffer,
  targetColorant: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer);
  const page = pdfDoc.getPage(0);

  let resources: PDFDict | undefined;
  try { resources = page.node.Resources(); } catch { /* no resources */ }
  if (!resources) return new Uint8Array(buffer);

  const colorSpaceDict = resolve(pdfDoc, resources.get(PDFName.of("ColorSpace")), PDFDict);
  if (!colorSpaceDict) return new Uint8Array(buffer);

  // tint → DeviceGray: 0=white (no ink), 1=black (full ink)
  const invertFn = pdfDoc.context.obj({
    FunctionType: 2, Domain: [0, 1], Range: [0, 1], C0: [1], C1: [0], N: 1,
  });
  // always white — this colorant is invisible in this pass
  const whiteFn = pdfDoc.context.obj({
    FunctionType: 2, Domain: [0, 1], Range: [0, 1], C0: [1], C1: [1], N: 1,
  });

  for (const [key, value] of colorSpaceDict.entries()) {
    const csArray = resolve(pdfDoc, value, PDFArray);
    if (!csArray) continue;

    const el0 = resolve(pdfDoc, csArray.get(0), PDFName);
    if (el0?.asString() !== "/Separation") continue;

    const el1 = resolve(pdfDoc, csArray.get(1), PDFName);
    if (!el1) continue;

    const name = decodeColorantName(el1.asString().slice(1));
    colorSpaceDict.set(key, pdfDoc.context.obj([
      PDFName.of("Separation"),
      el1,
      PDFName.of("DeviceGray"),
      name === targetColorant ? invertFn : whiteFn,
    ]));
  }

  return pdfDoc.save();
}

async function renderCmykChannels(
  buffer: ArrayBuffer,
  names: string[],
): Promise<Record<string, ImageBitmap>> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_W / viewport.width, TARGET_H / viewport.height);
    const scaled = page.getViewport({ scale });
    const w = Math.round(scaled.width);
    const h = Math.round(scaled.height);

    const composite = new OffscreenCanvas(w, h);
    const ctx = composite.getContext("2d") as unknown as CanvasRenderingContext2D;
    await page.render({ canvas: null, canvasContext: ctx, viewport: scaled }).promise;

    const rgbaData = (composite.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D)
      .getImageData(0, 0, w, h).data;

    const channelIndex: Record<string, number> = {
      Cyan: 0, Magenta: 1, Yellow: 2, Black: 3,
    };

    const result: Record<string, ImageBitmap> = {};
    for (const name of names) {
      const idx = channelIndex[name];
      if (idx === undefined) continue;

      const channelCanvas = new OffscreenCanvas(w, h);
      const channelCtx = channelCanvas.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D;
      const channelData = channelCtx.createImageData(w, h);

      for (let i = 0; i < rgbaData.length; i += 4) {
        const r = rgbaData[i]     / 255;
        const g = rgbaData[i + 1] / 255;
        const b = rgbaData[i + 2] / 255;
        const k = 1 - Math.max(r, g, b);
        let ink: number;
        if (k >= 1) {
          ink = idx === 3 ? 1 : 0;
        } else {
          const d = 1 - k;
          if      (idx === 0) ink = (1 - r - k) / d;
          else if (idx === 1) ink = (1 - g - k) / d;
          else if (idx === 2) ink = (1 - b - k) / d;
          else                ink = k;
        }
        const gray = Math.round((1 - ink) * 255);
        channelData.data[i]     = gray;
        channelData.data[i + 1] = gray;
        channelData.data[i + 2] = gray;
        channelData.data[i + 3] = 255;
      }

      channelCtx.putImageData(channelData, 0, 0);
      result[name] = await createImageBitmap(channelCanvas);
    }
    return result;
  } finally {
    await pdf.destroy();
  }
}

async function renderFirstPage(bytes: Uint8Array): Promise<ImageBitmap> {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_W / viewport.width, TARGET_H / viewport.height);
    const scaled = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(Math.round(scaled.width), Math.round(scaled.height));
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    await page.render({ canvas: null, canvasContext: ctx, viewport: scaled }).promise;
    return createImageBitmap(canvas);
  } finally {
    await pdf.destroy();
  }
}

function decodeColorantName(encoded: string): string {
  return encoded.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
