// src/components/press/StationDetail.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { StationDetail } from "./StationDetail";

function makeProps(overrides = {}) {
  return {
    job: snackPouchJob,
    settings: createInitialSettings(snackPouchJob),
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40, setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "operate" as const,
    channelId: "C",
    stationAngle: 315,
    stationNumber: 1,
    stationCount: 7,
    channelName: "Cyan",
    onPrevStation: vi.fn(),
    onNextStation: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
}

describe("StationDetail", () => {
  it("renders a canvas element", () => {
    const { container } = render(<StationDetail {...makeProps()} />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("fires onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<StationDetail {...makeProps({ onBack })} />);
    fireEvent.click(screen.getByRole("button", { name: /back to press/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows operate mode callout labels", () => {
    render(<StationDetail {...makeProps()} />);
    expect(screen.getByTestId("callout-anilox")).toBeInTheDocument();
    expect(screen.getByTestId("callout-viscosity")).toBeInTheDocument();
    expect(screen.getByTestId("callout-impression")).toBeInTheDocument();
    expect(screen.getByTestId("callout-strength")).toBeInTheDocument();
  });

  it("callout shows correct anilox BCM value from settings", () => {
    render(<StationDetail {...makeProps()} />);
    const callout = screen.getByTestId("callout-anilox");
    expect(callout.textContent).toContain("4.5");
  });

  it("shows learn mode component labels instead of callouts", () => {
    render(<StationDetail {...makeProps({ mode: "learn" })} />);
    expect(screen.getByTestId("learn-label-aniloxRoll")).toBeInTheDocument();
    expect(screen.getByTestId("learn-label-plateCylinder")).toBeInTheDocument();
    expect(screen.getByTestId("learn-label-inkChamber")).toBeInTheDocument();
  });
});
