import type { ChannelDef, ChannelId, InkChannelSettings, RegistrationOffset } from "../domain/types";
import type { CustomPdfJob, LayerImages } from "../domain/types";
import { snackPouchJob } from "../domain/jobs";

const CHANNEL_COLORS: Record<string, string> = {
  C: "#00bef0", M: "#e0009a", Y: "#c89400", K: "#222222",
  orange: "#ff6a00", silver: "#a8b4be", white: "#f0f0f0",
};

const SCREEN_ANGLES: Record<string, number> = {
  C: 15, M: 75, Y: 0, K: 45, orange: 30, silver: 60, white: 22,
};

const TARGET_DENSITIES: Record<string, number> = {
  C: 1.4, M: 1.4, Y: 1.0, K: 1.6, orange: 1.5, silver: 1.2, white: 0.9,
};

const PROCESS_IDS = new Set(["C", "M", "Y", "K"]);

const DEFAULT_INK: InkChannelSettings = {
  aniloxVolume: 3.2,
  viscosity:    28,
  strength:     100,
  impression:   60,
};

const ZERO_REG: RegistrationOffset = { x: 0, y: 0 };

export function buildCustomJob(
  filename: string,
  mapping: Record<string, ChannelId | "ignore">,
  layerImages: LayerImages,
): CustomPdfJob {
  const channels: ChannelDef[] = Object.entries(mapping)
    .filter(([, id]) => id !== "ignore")
    .map(([layerName, id]) => ({
      id:             id as ChannelId,
      name:           layerName,
      isProcess:      PROCESS_IDS.has(id as string),
      displayColor:   CHANNEL_COLORS[id as string] ?? "#888888",
      screenAngle:    SCREEN_ANGLES[id as string]  ?? 0,
      artworkZones:   [],
      initiallyActive: true,
      targetDensity:  TARGET_DENSITIES[id as string] ?? 1.3,
    }));

  const inkChannels: Record<ChannelId, InkChannelSettings> = {};
  const registration: Record<ChannelId, RegistrationOffset> = {};
  // Re-key layer images from layer name → channel ID so pdfArtwork.ts can look up by ch.id
  const keyedImages: LayerImages = {};
  for (const [layerName, id] of Object.entries(mapping)) {
    if (id !== "ignore" && layerImages[layerName]) {
      keyedImages[id as string] = layerImages[layerName];
    }
  }

  for (const ch of channels) {
    inkChannels[ch.id]   = { ...DEFAULT_INK };
    registration[ch.id]  = { ...ZERO_REG };
  }

  return {
    ...snackPouchJob,
    id:          "__custom__",
    name:        `Custom: ${filename}`,
    description: `Uploaded from ${filename}`,
    channels,
    initialSettings: {
      ...snackPouchJob.initialSettings,
      inkChannels,
      registration,
    },
    customPdf: { filename, layerImages: keyedImages },
  };
}
