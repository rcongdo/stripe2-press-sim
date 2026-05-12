import { render, screen } from "@testing-library/react";
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
    // vitest-canvas-mock tracks calls — fillRect should have been called for substrate
    expect(ctx.fillRect).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
