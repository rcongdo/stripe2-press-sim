import type {
  ChannelId,
  InkChannelSettingKey,
  InkChannelSettings,
  JobPreset,
  PressSettingKey,
  PressSettings,
} from "./types";

export function createInitialSettings(job: JobPreset): PressSettings {
  return structuredClone(job.initialSettings);
}

export function clampSetting(job: JobPreset, key: PressSettingKey, value: number): number {
  const range = job.ranges[key];
  if (!Number.isFinite(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, value));
}

export function updateSetting(
  job: JobPreset,
  settings: PressSettings,
  key: PressSettingKey,
  value: number,
): PressSettings {
  return { ...settings, [key]: clampSetting(job, key, value) };
}

export function createPerfectSettings(job: JobPreset): PressSettings {
  const activeChannels = job.channels.filter(ch => ch.initiallyActive);
  const perfectChannel: InkChannelSettings = {
    aniloxVolume: job.target.aniloxVolume,
    viscosity: job.target.viscosity,
    strength: 100,
    impression: job.target.impression,
  };
  return {
    substrate: job.substrateOptions[0],
    webTension: job.target.tension,
    dryerTemperature: 160,
    pressSpeed: job.target.speed,
    inkChannels: Object.fromEntries(activeChannels.map(ch => [ch.id, { ...perfectChannel }])),
    registration: Object.fromEntries(activeChannels.map(ch => [ch.id, { x: 0, y: 0 }])),
  };
}

export function updateInkChannelSetting(
  job: JobPreset,
  settings: PressSettings,
  channel: ChannelId,
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

export function activateSpotChannel(
  job: JobPreset,
  settings: PressSettings,
  channelId: ChannelId,
): PressSettings {
  if (channelId in settings.inkChannels) return settings;
  return {
    ...settings,
    inkChannels: {
      ...settings.inkChannels,
      [channelId]: {
        aniloxVolume: job.target.aniloxVolume,
        viscosity: job.target.viscosity,
        strength: 100,
        impression: job.target.impression,
      },
    },
    registration: {
      ...settings.registration,
      [channelId]: { x: 0, y: 0 },
    },
  };
}

export function deactivateSpotChannel(
  settings: PressSettings,
  channelId: ChannelId,
): PressSettings {
  const { [channelId]: _ink, ...restInk } = settings.inkChannels;
  const { [channelId]: _reg, ...restReg } = settings.registration;
  return { ...settings, inkChannels: restInk, registration: restReg };
}
