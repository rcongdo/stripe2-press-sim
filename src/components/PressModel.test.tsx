import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { LocaleProvider } from "../i18n/LocaleContext";
import { PressModel } from "./PressModel";

function wrap(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const baseProps = {
  job: snackPouchJob,
  settings: createInitialSettings(snackPouchJob),
  outcome: {
    density: 1.35, gain: 0,
    channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
    channelGain: { C: 0, M: 0, Y: 0, K: 0 },
    registerError: 0, dryingRisk: 20, wasteRate: 40,
    setupQuality: 85, defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
    coaching: [],
  },
  selectedChannelId: "C",
};

describe("PressModel", () => {
  it("renders Operate and Learn mode buttons", () => {
    wrap(<PressModel {...baseProps} />);
    expect(screen.getByRole("button", { name: "Operate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn" })).toBeInTheDocument();
  });

  it("defaults to Operate mode with overview visible", () => {
    wrap(<PressModel {...baseProps} />);
    expect(screen.getByRole("button", { name: "Operate" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
    expect(screen.queryByTestId("station-detail")).not.toBeInTheDocument();
  });

  it("switches to Learn mode when Learn button is clicked", () => {
    wrap(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Learn" }));
    expect(screen.getByRole("button", { name: "Learn" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Operate" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to station detail when a station is clicked", () => {
    wrap(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByTestId("station-C"));
    expect(screen.getByTestId("station-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("press-overview")).not.toBeInTheDocument();
  });

  it("returns to overview when back button is clicked", () => {
    wrap(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByTestId("station-C"));
    fireEvent.click(screen.getByRole("button", { name: /back to press/i }));
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });
});
