import { describe, expect, it } from "vitest";
import { snackPouchJob, starterJob } from "./jobs";
import {
  activateSpotChannel,
  clampSetting,
  createInitialSettings,
  deactivateSpotChannel,
  updateInkChannelSetting,
  updateSetting,
} from "./settings";

describe("press setting helpers", () => {
  it("creates imperfect starter settings for the starter job", () => {
    const settings = createInitialSettings(starterJob);
    expect(settings).not.toBe(starterJob.initialSettings);
    expect(settings.registration).not.toBe(starterJob.initialSettings.registration);
    expect(settings.inkChannels.C.impression).toBe(67);
    expect(settings.pressSpeed).toBe(760);
    expect(settings.registration.C.x).toBe(-1.4);
  });

  it("clamps numeric settings to their configured range", () => {
    expect(clampSetting(starterJob, "webTension", 200)).toBe(80);
    expect(clampSetting(starterJob, "pressSpeed", 100)).toBe(300);
  });

  it("returns the setting minimum for non-finite numeric settings", () => {
    expect(clampSetting(starterJob, "webTension", Number.NaN)).toBe(20);
  });

  it("updates settings without mutating the original object", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "webTension", 60);
    expect(updated).not.toBe(original);
    expect(updated.webTension).toBe(60);
    expect(original.webTension).toBe(38);
  });

  it("clamps updated settings to their configured range", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "webTension", 200);
    expect(updated.webTension).toBe(80);
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

describe("activateSpotChannel / deactivateSpotChannel", () => {
  it("activateSpotChannel adds channel to inkChannels and registration", () => {
    const settings = deactivateSpotChannel(createInitialSettings(snackPouchJob), "orange");
    expect("orange" in settings.inkChannels).toBe(false);

    const updated = activateSpotChannel(snackPouchJob, settings, "orange");
    expect("orange" in updated.inkChannels).toBe(true);
    expect("orange" in updated.registration).toBe(true);
    expect(updated.registration.orange).toEqual({ x: 0, y: 0 });
    expect(updated.inkChannels.orange.aniloxVolume).toBe(snackPouchJob.target.aniloxVolume);
  });

  it("deactivateSpotChannel removes channel from inkChannels and registration", () => {
    const settings = createInitialSettings(snackPouchJob);
    const activated = activateSpotChannel(snackPouchJob, settings, "orange");
    const deactivated = deactivateSpotChannel(activated, "orange");
    expect("orange" in deactivated.inkChannels).toBe(false);
    expect("orange" in deactivated.registration).toBe(false);
  });

  it("activate does not mutate original settings", () => {
    const settings = deactivateSpotChannel(createInitialSettings(snackPouchJob), "orange");
    activateSpotChannel(snackPouchJob, settings, "orange");
    expect("orange" in settings.inkChannels).toBe(false);
  });

  it("activating an already-active process channel is a no-op (channel already present)", () => {
    const settings = createInitialSettings(snackPouchJob);
    const updated = activateSpotChannel(snackPouchJob, settings, "C");
    expect(updated.inkChannels.C).toEqual(settings.inkChannels.C);
  });
});
