import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "../simulation/engine";
import { PrintPreview } from "./PrintPreview";

const defaultSettings = createInitialSettings(starterJob);
const outcome = simulatePress(starterJob, defaultSettings);

describe("PrintPreview", () => {
  it("renders the live print sample section with a canvas", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("print-canvas")).toBeInTheDocument();
    expect(screen.getByText(`${outcome.setupQuality}% setup quality`)).toBeInTheDocument();
  });

  it("canvas context is available via vitest-canvas-mock", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    expect(ctx).not.toBeNull();
  });

  it("draws substrate background on mount", () => {
    vi.useFakeTimers();
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    vi.runAllTimers();
    // Full-canvas substrate rect must be the first fillRect call
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 920, 420);
    vi.useRealTimers();
  });

  it("defaults to 1× zoom with canvas CSS width of 920px", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "920px" });
    expect(screen.getByText("1×")).toBeInTheDocument();
  });

  it("steps to 2× when zoom in is clicked", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "1840px" });
    expect(screen.getByText("2×")).toBeInTheDocument();
  });

  it("steps to 0.5× when zoom out is clicked", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "460px" });
    expect(screen.getByText("0.5×")).toBeInTheDocument();
  });

  it("disables zoom out at minimum zoom (0.5×)", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(screen.getByLabelText("Zoom out")).toBeDisabled();
  });

  it("disables zoom in at maximum zoom (4×)", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom in")); // 2×
    fireEvent.click(screen.getByLabelText("Zoom in")); // 4×
    expect(screen.getByLabelText("Zoom in")).toBeDisabled();
  });

  it("applies pixelated image rendering at zoom > 1", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom in")); // 2×
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ imageRendering: "pixelated" });
  });

  it("does not apply pixelated image rendering at 1× zoom", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    expect(canvas.style.imageRendering).not.toBe("pixelated");
  });

  it("reaches 4× zoom (canvas CSS width 3680px) after two zoom in clicks", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} />);
    fireEvent.click(screen.getByLabelText("Zoom in")); // 2×
    fireEvent.click(screen.getByLabelText("Zoom in")); // 4×
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "3680px" });
    expect(screen.getByText("4×")).toBeInTheDocument();
  });
});
