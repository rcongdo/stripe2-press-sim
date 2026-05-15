import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { InlineOverview } from "./InlineOverview";

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
    inkType: "water-based" as const,
    onStationClick: vi.fn(),
    ...overrides,
  };
}

describe("InlineOverview", () => {
  it("renders an SVG element with data-testid=press-overview", () => {
    render(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    render(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    render(<InlineOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M");
  });

  it("marks the selected station", () => {
    render(<InlineOverview {...makeProps({ selectedChannelId: "K" })} />);
    expect(screen.getByTestId("station-K")).toHaveAttribute("data-selected", "true");
  });

  it("shows inter-station dryer labels in learn mode with water-based ink", () => {
    render(<InlineOverview {...makeProps({ mode: "learn" })} />);
    expect(screen.getAllByText("Dryer").length).toBeGreaterThan(0);
  });

  it("shows UV labels in learn mode with UV ink", () => {
    render(<InlineOverview {...makeProps({ mode: "learn", inkType: "uv" })} />);
    expect(screen.getAllByText("UV").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dryer")).not.toBeInTheDocument();
  });
});
