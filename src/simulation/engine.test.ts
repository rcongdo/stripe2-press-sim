import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "./engine";

function makeChannels(aniloxVolume: number, viscosity: number, strength: number, impression: number) {
  return {
    C: { aniloxVolume, viscosity, strength, impression },
    M: { aniloxVolume, viscosity, strength, impression },
    Y: { aniloxVolume, viscosity, strength, impression },
    K: { aniloxVolume, viscosity, strength, impression },
  };
}

const zeroReg = {
  C: { x: 0, y: 0 },
  M: { x: 0, y: 0 },
  Y: { x: 0, y: 0 },
  K: { x: 0, y: 0 },
};

describe("simulatePress", () => {
  it("scores a near-target setup as press ready", () => {
    const outcome = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      webTension: 50,
      dryerTemperature: 150,
      pressSpeed: 650,
      registration: zeroReg,
      inkChannels: makeChannels(3.2, 28, 100, 60),
    });
    expect(outcome.setupQuality).toBeGreaterThanOrEqual(90);
    expect(outcome.defects.pinholes).toBeLessThan(10);
    expect(outcome.defects.dirtyPrint).toBeLessThan(10);
  });

  it("increases gain and dirty print with excessive impression", () => {
    const base = createInitialSettings(starterJob);
    const normal    = simulatePress(starterJob, { ...base, inkChannels: makeChannels(4.5, 28, 100, 54) });
    const excessive = simulatePress(starterJob, { ...base, inkChannels: makeChannels(4.5, 28, 100, 92) });
    expect(excessive.gain).toBeGreaterThan(normal.gain);
    expect(excessive.defects.dirtyPrint).toBeGreaterThan(normal.defects.dirtyPrint);
  });

  it("lowers density and increases pinholes with insufficient impression", () => {
    const base = createInitialSettings(starterJob);
    const normal = simulatePress(starterJob, { ...base, inkChannels: makeChannels(4.5, 28, 100, 54) });
    const light  = simulatePress(starterJob, { ...base, inkChannels: makeChannels(4.5, 28, 100, 18) });
    expect(light.density).toBeLessThan(normal.density);
    expect(light.defects.pinholes).toBeGreaterThan(normal.defects.pinholes);
  });

  it("raises drying risk when speed and ink load exceed drying capacity", () => {
    const base = createInitialSettings(starterJob);
    const controlled = simulatePress(starterJob, {
      ...base,
      pressSpeed: 520,
      dryerTemperature: 160,
      inkChannels: makeChannels(3.0, 28, 96, 54),
    });
    const risky = simulatePress(starterJob, {
      ...base,
      pressSpeed: 1150,
      dryerTemperature: 90,
      inkChannels: makeChannels(5.4, 28, 118, 54),
    });
    expect(risky.dryingRisk).toBeGreaterThan(controlled.dryingRisk);
    expect(risky.coaching.some((m) => m.id === "drying-risk")).toBe(true);
  });

  it("reports registration error from color offsets", () => {
    const outcome = simulatePress(starterJob, createInitialSettings(starterJob));
    expect(outcome.registerError).toBeGreaterThan(1);
    expect(outcome.coaching.some((m) => m.id === "registration-offset")).toBe(true);
  });

  it("channels with different strengths produce different channelDensity values", () => {
    const base = createInitialSettings(starterJob);
    const lowC  = { ...base, inkChannels: { ...base.inkChannels, C: { ...base.inkChannels.C, viscosity: 28, strength: 70,  impression: 54 } } };
    const highC = { ...base, inkChannels: { ...base.inkChannels, C: { ...base.inkChannels.C, viscosity: 28, strength: 120, impression: 54 } } };
    expect(simulatePress(starterJob, highC).channelDensity.C).toBeGreaterThan(
      simulatePress(starterJob, lowC).channelDensity.C,
    );
  });

  it("density equals the mean of all active channelDensity values", () => {
    const outcome = simulatePress(starterJob, createInitialSettings(starterJob));
    const vals = Object.values(outcome.channelDensity);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(outcome.density).toBeCloseTo(mean, 2);
  });

  it("higher impression on one channel raises its channelGain without affecting others", () => {
    const base = createInitialSettings(starterJob);
    const highK = {
      ...base,
      inkChannels: { ...base.inkChannels, K: { ...base.inkChannels.K, viscosity: 28, strength: 100, impression: 90 } },
    };
    const baseOutcome  = simulatePress(starterJob, base);
    const highKOutcome = simulatePress(starterJob, highK);
    expect(highKOutcome.channelGain.K).toBeGreaterThan(baseOutcome.channelGain.K);
    expect(highKOutcome.channelGain.C).toBeCloseTo(baseOutcome.channelGain.C, 2);
  });
});
