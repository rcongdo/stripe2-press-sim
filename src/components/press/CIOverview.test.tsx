// src/components/press/CIOverview.test.tsx
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { CIOverview } from "./CIOverview";

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

function wrap(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("CIOverview", () => {
  it("renders an SVG element", () => {
    const { container } = wrap(<CIOverview {...makeProps()} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    wrap(<CIOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with the correct channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    wrap(<CIOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M", expect.any(Number));
  });

  it("highlights the selected station", () => {
    wrap(<CIOverview {...makeProps({ selectedChannelId: "K" })} />);
    const station = screen.getByTestId("station-K");
    expect(station).toHaveAttribute("data-selected", "true");
  });

  it("shows CI drum tooltip on hover in learn mode", async () => {
    wrap(<CIOverview {...makeProps({ mode: "learn" })} />);
    // The CI drum group is identifiable by the static "CI Drum" text it always shows
    const drumText = screen.getByText("CI Drum");
    fireEvent.mouseEnter(drumText.closest("g")!);
    expect(await screen.findByText("Central Impression Drum")).toBeInTheDocument();
    fireEvent.mouseLeave(drumText.closest("g")!);
  });

  it("does not show component tooltips in operate mode", () => {
    wrap(<CIOverview {...makeProps({ mode: "operate" })} />);
    expect(screen.queryByText("Central Impression Drum")).not.toBeInTheDocument();
  });
});
