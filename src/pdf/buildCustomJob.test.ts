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
  });

  it("re-keys layerImages from layer name to channel ID", () => {
    const job = buildCustomJob("test.pdf", { Cyan: "C", Black: "K" }, mockImages);
    // pdfArtwork.ts looks up images by channel ID (ch.id), not layer name
    expect(job.customPdf.layerImages["C"]).toBe(mockImages.Cyan);
    expect(job.customPdf.layerImages["K"]).toBe(mockImages.Black);
    expect(job.customPdf.layerImages["Cyan"]).toBeUndefined();
  });

  it("excludes ignored layers from layerImages", () => {
    const job = buildCustomJob("art.pdf", { Cyan: "C", Spot: "ignore" }, mockImages);
    expect(job.customPdf.layerImages["C"]).toBe(mockImages.Cyan);
    expect("Spot" in job.customPdf.layerImages).toBe(false);
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
