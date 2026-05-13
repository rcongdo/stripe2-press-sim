import type { InkChannelKey, InkChannelSettingKey, InkChannelSettings, JobPreset, PressSettingKey, PressSettings } from "./types";

export function createInitialSettings(job: JobPreset): PressSettings {
  return structuredClone(job.initialSettings);
}

export function clampSetting(
  job: JobPreset,
  key: PressSettingKey,
  value: number,
): number {
  const range = job.ranges[key];
  if (!Number.isFinite(value)) {
    return range.min;
  }

  return Math.min(range.max, Math.max(range.min, value));
}

export function updateSetting(
  job: JobPreset,
  settings: PressSettings,
  key: PressSettingKey,
  value: number,
): PressSettings {
  return {
    ...settings,
    [key]: clampSetting(job, key, value),
  };
}

// dryerTemperature=160 gives dryingRisk=0 at target speed/anilox/strength
export function createPerfectSettings(job: JobPreset): PressSettings {
  const perfectChannel: InkChannelSettings = {
    aniloxVolume: job.target.aniloxVolume,
    viscosity: job.target.viscosity,
    strength: 100,
    impression: job.target.impression,
  };
  return {
    substrate: "pet-film",
    webTension: job.target.tension,
    dryerTemperature: 160,
    pressSpeed: job.target.speed,
    inkChannels: { C: perfectChannel, M: perfectChannel, Y: perfectChannel, K: perfectChannel },
    registration: {
      cyanX: 0, cyanY: 0,
      magentaX: 0, magentaY: 0,
      yellowX: 0, yellowY: 0,
      blackX: 0, blackY: 0,
    },
  };
}

export function updateInkChannelSetting(
  job: JobPreset,
  settings: PressSettings,
  channel: InkChannelKey,
  key: InkChannelSettingKey,
  value: number,
): PressSettings {
  const range = job.inkChannelRanges[key];
  const clamped = Math.min(range.max, Math.max(range.min, value));
  return {
    ...settings,
    inkChannels: {
      ...settings.inkChannels,
      [channel]: { ...settings.inkChannels[channel], [key]: clamped },
    },
  };
}
