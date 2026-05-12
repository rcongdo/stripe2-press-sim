import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "./engine";

describe("simulatePress", () => {
  it("scores a near-target setup as press ready", () => {
    const outcome = simulatePress(starterJob, {
      ...starterJob.initialSettings,
      aniloxVolume: 3.2,
      inkViscosity: 28,
      inkStrength: 100,
      impression: 54,
      webTension: 50,
      dryerTemperature: 150,
      pressSpeed: 650,
      registration: {
        cyanX: 0,
        cyanY: 0,
        magentaX: 0,
        magentaY: 0,
        yellowX: 0,
        yellowY: 0,
        blackX: 0,
        blackY: 0,
      },
    });

    expect(outcome.setupQuality).toBeGreaterThanOrEqual(90);
    expect(outcome.defects.pinholes).toBeLessThan(10);
    expect(outcome.defects.dirtyPrint).toBeLessThan(10);
  });

  it("increases gain and dirty print with excessive impression", () => {
    const normal = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 54,
    });
    const excessive = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 92,
    });

    expect(excessive.gain).toBeGreaterThan(normal.gain);
    expect(excessive.defects.dirtyPrint).toBeGreaterThan(normal.defects.dirtyPrint);
  });

  it("lowers density and increases pinholes with insufficient impression", () => {
    const normal = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 54,
    });
    const light = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 18,
    });

    expect(light.density).toBeLessThan(normal.density);
    expect(light.defects.pinholes).toBeGreaterThan(normal.defects.pinholes);
  });

  it("raises drying risk when speed and ink load exceed drying capacity", () => {
    const controlled = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      pressSpeed: 520,
      aniloxVolume: 3,
      inkStrength: 96,
      dryerTemperature: 160,
    });
    const risky = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      pressSpeed: 1150,
      aniloxVolume: 5.4,
      inkStrength: 118,
      dryerTemperature: 90,
    });

    expect(risky.dryingRisk).toBeGreaterThan(controlled.dryingRisk);
    expect(risky.coaching.some((message) => message.id === "drying-risk")).toBe(true);
  });

  it("reports registration error from color offsets", () => {
    const outcome = simulatePress(starterJob, createInitialSettings(starterJob));

    expect(outcome.registerError).toBeGreaterThan(1);
    expect(outcome.coaching.some((message) => message.id === "registration-offset")).toBe(true);
  });
});
