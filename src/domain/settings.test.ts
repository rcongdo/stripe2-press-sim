import { describe, expect, it } from "vitest";
import { starterJob } from "./jobs";
import { clampSetting, createInitialSettings, updateInkChannelSetting, updateSetting } from "./settings";

describe("press setting helpers", () => {
  it("creates imperfect starter settings for the starter job", () => {
    const settings = createInitialSettings(starterJob);

    expect(settings).not.toBe(starterJob.initialSettings);
    expect(settings.registration).not.toBe(starterJob.initialSettings.registration);
    expect(settings.impression).toBe(67);
    expect(settings.pressSpeed).toBe(760);
    expect(settings.registration.cyanX).toBe(-1.4);
  });

  it("clamps numeric settings to their configured range", () => {
    expect(clampSetting(starterJob, "impression", 120)).toBe(100);
    expect(clampSetting(starterJob, "pressSpeed", 100)).toBe(300);
  });

  it("returns the setting minimum for non-finite numeric settings", () => {
    expect(clampSetting(starterJob, "impression", Number.NaN)).toBe(0);
  });

  it("updates settings without mutating the original object", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "inkViscosity", 42);

    expect(updated).not.toBe(original);
    expect(updated.inkViscosity).toBe(42);
    expect(original.inkViscosity).toBe(31);
  });

  it("clamps updated settings to their configured range", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "impression", 120);

    expect(updated.impression).toBe(100);
  });
});

describe("updateInkChannelSetting", () => {
  it("clamps viscosity above range max", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "C", "viscosity", 99);
    expect(result.inkChannels.C.viscosity).toBe(45);
  });

  it("clamps impression below range min", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "M", "impression", -5);
    expect(result.inkChannels.M.impression).toBe(0);
  });

  it("does not affect other channels", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "C", "viscosity", 25);
    expect(result.inkChannels.M.viscosity).toBe(settings.inkChannels.M.viscosity);
    expect(result.inkChannels.Y.viscosity).toBe(settings.inkChannels.Y.viscosity);
    expect(result.inkChannels.K.viscosity).toBe(settings.inkChannels.K.viscosity);
  });

  it("does not mutate the original settings object", () => {
    const settings = createInitialSettings(starterJob);
    const original = settings.inkChannels.C.viscosity;
    updateInkChannelSetting(starterJob, settings, "C", "viscosity", 40);
    expect(settings.inkChannels.C.viscosity).toBe(original);
  });
});
