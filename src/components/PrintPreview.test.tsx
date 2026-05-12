import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "../simulation/engine";
import { PrintPreview } from "./PrintPreview";

describe("PrintPreview", () => {
  it("renders the live print sample section with a canvas", () => {
    const settings = createInitialSettings(starterJob);
    const outcome = simulatePress(starterJob, settings);

    render(<PrintPreview settings={settings} outcome={outcome} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("print-canvas")).toBeInTheDocument();
    expect(screen.getByText(`${outcome.setupQuality}% setup quality`)).toBeInTheDocument();
  });
});
