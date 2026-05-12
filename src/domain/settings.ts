import type { JobPreset, PressSettingKey, PressSettings } from "./types";

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
