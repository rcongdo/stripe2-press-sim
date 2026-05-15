import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { LocaleProvider } from "../../i18n/LocaleContext";
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

function wrap(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("InlineOverview", () => {
  it("renders an SVG element with data-testid=press-overview", () => {
    wrap(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    wrap(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    wrap(<InlineOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M");
  });

  it("marks the selected station", () => {
    wrap(<InlineOverview {...makeProps({ selectedChannelId: "K" })} />);
    expect(screen.getByTestId("station-K")).toHaveAttribute("data-selected", "true");
  });

  it("shows dryer tooltip on hover in learn mode with water-based ink", async () => {
    const { container } = wrap(<InlineOverview {...makeProps({ mode: "learn" })} />);
    // Find a dryer icon group (has a rect with orange stroke)
    const dryerRect = container.querySelector("rect[stroke='#d06030']");
    expect(dryerRect).toBeTruthy();
    fireEvent.mouseEnter(dryerRect!.parentElement!);
    expect(await screen.findByText("Inter-station Dryer / UV Lamp")).toBeInTheDocument();
    fireEvent.mouseLeave(dryerRect!.parentElement!);
  });

  it("shows UV dryer icon in learn mode with UV ink", () => {
    const { container } = wrap(<InlineOverview {...makeProps({ mode: "learn", inkType: "uv" })} />);
    const uvRect = container.querySelector("rect[stroke='#c8a000']");
    expect(uvRect).toBeTruthy();
    expect(container.querySelector("rect[stroke='#d06030']")).toBeNull();
  });
});
