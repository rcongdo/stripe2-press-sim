// src/components/press/PressOverview.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { PressOverview } from "./PressOverview";

function makeProps(overrides = {}) {
  const settings = createInitialSettings(snackPouchJob);
  return {
    job: snackPouchJob,
    settings,
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40,
      setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "operate" as const,
    selectedChannelId: "C",
    onStationClick: vi.fn(),
    ...overrides,
  };
}

describe("PressOverview", () => {
  it("renders an SVG element", () => {
    const { container } = render(<PressOverview {...makeProps()} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    render(<PressOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with the correct channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    render(<PressOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M", expect.any(Number));
  });

  it("highlights the selected station", () => {
    render(<PressOverview {...makeProps({ selectedChannelId: "K" })} />);
    const station = screen.getByTestId("station-K");
    expect(station).toHaveAttribute("data-selected", "true");
  });

  it("shows component labels in learn mode", () => {
    render(<PressOverview {...makeProps({ mode: "learn" })} />);
    expect(screen.getByText("Central Impression Drum")).toBeInTheDocument();
    expect(screen.getAllByText("Anilox Roll").length).toBeGreaterThan(0);
  });

  it("does not show component labels in operate mode", () => {
    render(<PressOverview {...makeProps({ mode: "operate" })} />);
    expect(screen.queryByText("Central Impression Drum")).not.toBeInTheDocument();
  });
});
