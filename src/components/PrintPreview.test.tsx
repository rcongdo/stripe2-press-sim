import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "../simulation/engine";
import { PrintPreview } from "./PrintPreview";

describe("PrintPreview", () => {
  it("renders a live print sample with defect overlays", () => {
    const settings = createInitialSettings(starterJob);
    const outcome = simulatePress(starterJob, settings);

    render(<PrintPreview settings={settings} outcome={outcome} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("cyan-layer")).toHaveAttribute("transform");
    expect(screen.getByTestId("pinholes")).toHaveAttribute(
      "opacity",
      String(outcome.defects.pinholes / 100),
    );
  });
});
