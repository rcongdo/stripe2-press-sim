import { describe, expect, it } from "vitest";
import { starterJob } from "./jobs";
import { clampSetting, createInitialSettings, updateSetting } from "./settings";

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
