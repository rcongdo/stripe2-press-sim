import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { LocaleProvider } from "../i18n/LocaleContext";
import { MetricsStrip } from "./MetricsStrip";

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
    mode: "guided" as const,
    onSettingChange: vi.fn(),
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("MetricsStrip", () => {
  it("shows dryer temperature label when ink type is water-based (default)", () => {
    wrap(<MetricsStrip {...makeProps()} />);
    expect(screen.getByText("Dryer temperature")).toBeInTheDocument();
  });

  it("shows UV power label when ink type is uv", () => {
    wrap(<MetricsStrip {...makeProps({ inkType: "uv" })} />);
    expect(screen.getByText("UV power")).toBeInTheDocument();
    expect(screen.queryByText("Dryer temperature")).not.toBeInTheDocument();
  });

  it("shows dryer temperature label when ink type is solvent", () => {
    wrap(<MetricsStrip {...makeProps({ inkType: "solvent" })} />);
    expect(screen.getByText("Dryer temperature")).toBeInTheDocument();
  });
});
