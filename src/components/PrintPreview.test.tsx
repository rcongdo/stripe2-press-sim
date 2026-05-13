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
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("print-canvas")).toBeInTheDocument();
    expect(screen.getByText(`${outcome.setupQuality}% setup quality`)).toBeInTheDocument();
  });

  it("canvas context is available via vitest-canvas-mock", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    expect(ctx).not.toBeNull();
  });

  it("draws substrate background on mount", () => {
    vi.useFakeTimers();
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    vi.runAllTimers();
    // Full-canvas substrate rect must be the first fillRect call
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 3680, 1680);
    vi.useRealTimers();
  });

  it("defaults to 1× zoom with canvas CSS width of 920px", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "920px" });
    expect(screen.getByText("1×")).toBeInTheDocument();
  });

  it("steps to 4× when zoom in is clicked once", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByTestId("print-canvas")).toHaveStyle({ width: "3680px" });
    expect(screen.getByText("4×")).toBeInTheDocument();
  });

  it("disables zoom out at minimum zoom (1×)", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    expect(screen.getByLabelText("Zoom out")).toBeDisabled();
  });

  it("disables zoom in at maximum zoom (4×)", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    fireEvent.click(screen.getByLabelText("Zoom in")); // 4×
    expect(screen.getByLabelText("Zoom in")).toBeDisabled();
  });

  it("never sets pixelated image rendering — 4× native scale handles dot visibility", () => {
    render(<PrintPreview settings={defaultSettings} outcome={outcome} job={starterJob} />);
    const canvas = screen.getByTestId("print-canvas") as HTMLCanvasElement;
    fireEvent.click(screen.getByLabelText("Zoom in")); // 4×
    expect(canvas.style.imageRendering).not.toBe("pixelated");
  });
});
