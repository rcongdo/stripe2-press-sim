// jsdom doesn't implement OffscreenCanvas.
// Return a real HTMLCanvasElement so ctx.drawImage(offscreen, ...) is accepted
// by vitest-canvas-mock, which validates drawImage source types strictly.
if (typeof OffscreenCanvas === "undefined") {
  (globalThis as unknown as Record<string, unknown>).OffscreenCanvas = function (
    width: number,
    height: number,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
}
