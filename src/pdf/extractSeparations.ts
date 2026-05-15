import * as pdfjsLib from "pdfjs-dist";
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

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

  const colorantNames = [...cmykNames, ...separationNames];
  if (colorantNames.length === 0) {
    throw new Error(
      "No color separations found. This PDF must declare inks as Separation color spaces.",
    );
  }

  const images: Record<string, ImageBitmap> = {};

  // PDF with every Separation ink blanked — leaves only raw DeviceCMYK image content.
  // Used as the "background" reference for both separation extraction and CMYK decomp.
  const cmykOnlyBytes = separationNames.length > 0
    ? await rewriteTintFunctions(buffer, "")
    : new Uint8Array(buffer);

  if (separationNames.length > 0) {
    try {
      const sepImages = await renderSeparationChannels(buffer, cmykOnlyBytes, separationNames);
      Object.assign(images, sepImages);
    } catch (e) {
      console.warn("Failed to render separation channels:", e);
    }
  }

  if (cmykNames.length > 0) {
    try {
      const cmykImages = await renderCmykChannels(cmykOnlyBytes, cmykNames);
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
// Also handles direct (inline) objects — pdf-lib's context.lookup throws on non-refs
// in some versions, so we check instanceof before trying the lookup.
// Uses { prototype: T } instead of a constructor type because pdf-lib classes
// have private/protected constructors that TypeScript won't accept as `new()`.
function resolve<T>(
  pdfDoc: PDFDocument,
  ref: ReturnType<PDFDict["get"]>,
  Type: { prototype: T },
): T | undefined {
  if (!ref) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (ref instanceof (Type as any)) return ref as unknown as T;
  try {
    const obj = pdfDoc.context.lookup(ref);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (obj instanceof (Type as any)) ? (obj as T) : undefined;
  } catch {
    return undefined;
  }
}

// XObjects are PDF streams (PDFRawStream), not plain PDFDicts. Both types carry
// a .dict property. This extracts whichever dict is available.
function resolveDict(
  pdfDoc: PDFDocument,
  ref: ReturnType<PDFDict["get"]>,
): PDFDict | undefined {
  if (!ref) return undefined;
  if (ref instanceof PDFDict) return ref;
  try {
    const obj = pdfDoc.context.lookup(ref) as unknown as { dict?: PDFDict };
    if (obj instanceof PDFDict) return obj;
    return obj?.dict instanceof PDFDict ? obj.dict : undefined;
  } catch {
    return undefined;
  }
}

// Walk a resources dict (and any Form XObjects it references) collecting Separation
// colorant names and detecting DeviceCMYK usage.  visited prevents infinite loops
// from circular XObject references.
function collectFromResources(
  pdfDoc: PDFDocument,
  resources: PDFDict,
  seen: Set<string>,
  separationNames: string[],
  hasCmykRef: { value: boolean },
  visited: Set<string>,
): void {
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

  const xObjectDict = resolve(pdfDoc, resources.get(PDFName.of("XObject")), PDFDict);
  if (!xObjectDict) return;

  for (const [, ref] of xObjectDict.entries()) {
    const xObj = resolveDict(pdfDoc, ref);
    if (!xObj) continue;

    // Detect DeviceCMYK image XObjects
    if (!hasCmykRef.value) {
      const csObj = resolve(pdfDoc, xObj.get(PDFName.of("ColorSpace")), PDFName);
      if (csObj?.asString() === "/DeviceCMYK") hasCmykRef.value = true;
    }

    // Recurse into Form XObjects
    const subtype = resolve(pdfDoc, xObj.get(PDFName.of("Subtype")), PDFName);
    if (subtype?.asString() !== "/Form") continue;
    const key = String(ref);
    if (visited.has(key)) continue;
    visited.add(key);
    const xRes = resolve(pdfDoc, xObj.get(PDFName.of("Resources")), PDFDict);
    if (xRes) collectFromResources(pdfDoc, xRes, seen, separationNames, hasCmykRef, visited);
  }
}

// Rewrite every Separation tint function in a resources dict (and Form XObjects)
// so that only targetColorant renders (others become white/invisible).
// Pass targetColorant="" to blank ALL separations (used for CMYK-only extraction).
function rewriteResourcesColorSpaces(
  pdfDoc: PDFDocument,
  resources: PDFDict,
  targetColorant: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invertFn: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whiteFn: any,
  visited: Set<string>,
): void {
  const colorSpaceDict = resolve(pdfDoc, resources.get(PDFName.of("ColorSpace")), PDFDict);
  if (colorSpaceDict) {
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
  }

  // Recurse into Form XObjects so their own resource dicts are rewritten too
  const xObjectDict = resolve(pdfDoc, resources.get(PDFName.of("XObject")), PDFDict);
  if (!xObjectDict) return;
  for (const [, ref] of xObjectDict.entries()) {
    const xObj = resolveDict(pdfDoc, ref);
    if (!xObj) continue;
    const subtype = resolve(pdfDoc, xObj.get(PDFName.of("Subtype")), PDFName);
    if (subtype?.asString() !== "/Form") continue;
    const key = String(ref);
    if (visited.has(key)) continue;
    visited.add(key);
    const xRes = resolve(pdfDoc, xObj.get(PDFName.of("Resources")), PDFDict);
    if (xRes) rewriteResourcesColorSpaces(pdfDoc, xRes, targetColorant, invertFn, whiteFn, visited);
  }
}

async function analyzeColorSpaces(buffer: ArrayBuffer): Promise<AnalysisResult> {
  const pdfDoc = await PDFDocument.load(buffer);
  const page = pdfDoc.getPage(0);

  const seen = new Set<string>();
  const separationNames: string[] = [];
  const hasCmykRef = { value: false };

  let resources: PDFDict | undefined;
  try {
    resources = page.node.Resources();
  } catch {
    return { separationNames, hasCmyk: false };
  }
  if (!resources) return { separationNames, hasCmyk: false };

  collectFromResources(pdfDoc, resources, seen, separationNames, hasCmykRef, new Set());

  return { separationNames, hasCmyk: hasCmykRef.value };
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

  // tint → DeviceGray: 0=white (no ink), 1=black (full ink)
  const invertFn = pdfDoc.context.obj({
    FunctionType: 2, Domain: [0, 1], Range: [0, 1], C0: [1], C1: [0], N: 1,
  });
  // always white — this colorant is invisible in this pass
  const whiteFn = pdfDoc.context.obj({
    FunctionType: 2, Domain: [0, 1], Range: [0, 1], C0: [1], C1: [1], N: 1,
  });

  // Rewrite page-level resources AND recurse into Form XObjects, which carry
  // their own ColorSpace dicts that would otherwise render at full color.
  rewriteResourcesColorSpaces(pdfDoc, resources, targetColorant, invertFn, whiteFn, new Set());

  return pdfDoc.save();
}

async function renderCmykChannels(
  buffer: ArrayBuffer | Uint8Array,
  names: string[],
): Promise<Record<string, ImageBitmap>> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const w = Math.round(viewport.width);
    const h = Math.round(viewport.height);

    const composite = new OffscreenCanvas(w, h);
    const compositeCtx = composite.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D;
    compositeCtx.fillStyle = "#ffffff";
    compositeCtx.fillRect(0, 0, w, h);
    await page.render({ canvas: null, canvasContext: compositeCtx as unknown as CanvasRenderingContext2D, viewport }).promise;

    const rgbaData = compositeCtx.getImageData(0, 0, w, h).data;

    type ChannelDef = { idx: number; cr: number; cg: number; cb: number };
    const channelDefs: Record<string, ChannelDef> = {
      Cyan:    { idx: 0, cr:   0, cg: 255, cb: 255 },
      Magenta: { idx: 1, cr: 255, cg:   0, cb: 255 },
      Yellow:  { idx: 2, cr: 255, cg: 255, cb:   0 },
      Black:   { idx: 3, cr:   0, cg:   0, cb:   0 },
    };

    const result: Record<string, ImageBitmap> = {};
    for (const name of names) {
      const def = channelDefs[name];
      if (!def) continue;
      const { idx, cr, cg, cb } = def;

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
        // White background tinted by channel color at ink density
        channelData.data[i]     = Math.round(255 * (1 - ink) + cr * ink);
        channelData.data[i + 1] = Math.round(255 * (1 - ink) + cg * ink);
        channelData.data[i + 2] = Math.round(255 * (1 - ink) + cb * ink);
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

// Render the first page of a PDF to an RGBA pixel array on a white background.
async function renderPageRgba(
  bytes: Uint8Array | ArrayBuffer,
): Promise<{ w: number; h: number; data: Uint8ClampedArray }> {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const w = Math.round(viewport.width);
    const h = Math.round(viewport.height);
    const canvas = new OffscreenCanvas(w, h);
    const offCtx = canvas.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D;
    // White substrate — prevents transparent canvas pixels from reading as (0,0,0)
    // which would otherwise produce spurious K ink in the CMYK decomposition.
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, w, h);
    await page.render({ canvas: null, canvasContext: offCtx as unknown as CanvasRenderingContext2D, viewport }).promise;
    return { w, h, data: offCtx.getImageData(0, 0, w, h).data };
  } finally {
    await pdf.destroy();
  }
}

// For each Separation colorant, extract its ink coverage by rendering the page
// twice — once with the ink active and once with all inks blanked — and computing:
//   coverage = 1 − (luminance_with_ink / luminance_background)
// This cancels out any DeviceCMYK image content that can't be suppressed via
// tint-function rewriting, leaving only the separation's own contribution.
async function renderSeparationChannels(
  buffer: ArrayBuffer,
  cmykOnlyBytes: Uint8Array,
  separationNames: string[],
): Promise<Record<string, ImageBitmap>> {
  // Background render: all separations white, only DeviceCMYK images visible
  const bg = await renderPageRgba(cmykOnlyBytes);

  const result: Record<string, ImageBitmap> = {};

  for (const name of separationNames) {
    try {
      const withBytes = await rewriteTintFunctions(buffer, name);
      const sep = await renderPageRgba(withBytes);

      const channelCanvas = new OffscreenCanvas(bg.w, bg.h);
      const channelCtx = channelCanvas.getContext("2d") as unknown as OffscreenCanvasRenderingContext2D;
      const channelData = channelCtx.createImageData(bg.w, bg.h);

      for (let i = 0; i < bg.data.length; i += 4) {
        const bgLum  = (bg.data[i] + bg.data[i + 1] + bg.data[i + 2]) / 3;
        const sepLum = (sep.data[i] + sep.data[i + 1] + sep.data[i + 2]) / 3;
        // bgLum is always ≥1 because we filled white first.
        // coverage > 0 means the ink darkened this pixel versus the CMYK background.
        const coverage = Math.max(0, 1 - sepLum / Math.max(1, bgLum));
        const v = Math.round(255 * (1 - coverage));
        channelData.data[i]     = v;
        channelData.data[i + 1] = v;
        channelData.data[i + 2] = v;
        channelData.data[i + 3] = 255;
      }

      channelCtx.putImageData(channelData, 0, 0);
      result[name] = await createImageBitmap(channelCanvas);
    } catch (e) {
      console.warn(`Failed to render separation "${name}":`, e);
    }
  }

  return result;
}

function decodeColorantName(encoded: string): string {
  return encoded.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
