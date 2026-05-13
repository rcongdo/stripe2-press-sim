import type { AniloxPreset, ChannelDef, JobPreset } from "./types";

export const aniloxPresets: readonly AniloxPreset[] = [
  { id: "ultra-fine",   label: "Ultra-fine — 1400 lpi / 1.8 BCM",   lineScreen: 1400, volume: 1.8 },
  { id: "fine",         label: "Fine — 1200 lpi / 2.4 BCM",          lineScreen: 1200, volume: 2.4 },
  { id: "standard",     label: "Standard — 1000 lpi / 3.2 BCM",      lineScreen: 1000, volume: 3.2 },
  { id: "medium-heavy", label: "Medium-heavy — 900 lpi / 3.8 BCM",   lineScreen:  900, volume: 3.8 },
  { id: "heavy",        label: "Heavy — 800 lpi / 4.5 BCM",          lineScreen:  800, volume: 4.5 },
  { id: "very-heavy",   label: "Very heavy — 700 lpi / 5.2 BCM",     lineScreen:  700, volume: 5.2 },
];

const SNACK_PROCESS_CHANNELS: ChannelDef[] = [
  { id: "C", name: "Cyan",    isProcess: true, displayColor: "#00bef0", screenAngle: 15, artworkZones: [], initiallyActive: true,  targetDensity: 1.4 },
  { id: "M", name: "Magenta", isProcess: true, displayColor: "#e0009a", screenAngle: 75, artworkZones: [], initiallyActive: true,  targetDensity: 1.4 },
  { id: "Y", name: "Yellow",  isProcess: true, displayColor: "#c89400", screenAngle:  0, artworkZones: [], initiallyActive: true,  targetDensity: 1.0 },
  { id: "K", name: "Black",   isProcess: true, displayColor: "#222222", screenAngle: 45, artworkZones: [], initiallyActive: true,  targetDensity: 1.6 },
];

const SNACK_SPOT_CHANNELS: ChannelDef[] = [
  {
    id: "orange", name: "Pantone 021 Orange", isProcess: false,
    displayColor: "#ff6a00", screenAngle: 30,
    artworkZones: [{ type: "rect", x: 0, y: 1160, w: 1120, h: 200 }],
    initiallyActive: false, targetDensity: 1.5,
  },
  {
    id: "silver", name: "Metallic Silver", isProcess: false,
    displayColor: "#a8b4be", screenAngle: 60,
    artworkZones: [{ type: "rect", x: 0, y: 40, w: 1120, h: 240 }],
    initiallyActive: false, targetDensity: 1.2,
  },
  {
    id: "white", name: "Opaque White", isProcess: false,
    displayColor: "#f0f0f0", screenAngle: 22,
    artworkZones: [{ type: "rect", x: 0, y: 40, w: 1120, h: 1600 }],
    initiallyActive: false, targetDensity: 0.9,
  },
];

export const snackPouchJob: JobPreset = {
  id: "snack-pouch-cmyk",
  name: "Snack Pouch Film",
  description: "Four-color process setup on PET film for a flexible packaging job.",
  substrateOptions: ["pet-film", "opp-film", "paper-laminate"],
  channels: [...SNACK_PROCESS_CHANNELS, ...SNACK_SPOT_CHANNELS],
  ranges: {
    webTension:       { min: 20,  max: 80,   step: 1,   unit: "pli", label: "Web tension" },
    dryerTemperature: { min: 80,  max: 180,  step: 5,   unit: "F",   label: "Dryer temperature" },
    pressSpeed:       { min: 300, max: 1200, step: 10,  unit: "fpm", label: "Press speed" },
  },
  inkChannelRanges: {
    aniloxVolume: { min: 1.8, max: 5.5, step: 0.1, unit: "BCM", label: "Anilox volume" },
    viscosity:    { min: 18,  max: 45,  step: 1,   unit: "s",   label: "Viscosity"  },
    strength:     { min: 70,  max: 120, step: 1,   unit: "%",   label: "Strength"   },
    impression:   { min: 0,   max: 100, step: 1,   unit: "%",   label: "Impression" },
  },
  target: {
    density: 1.35,
    gain: 0,
    dryingCapacity: 0.72,
    tension: 50,
    speed: 650,
    aniloxVolume: 3.2,
    viscosity: 28,
    impression: 54,
  },
  initialSettings: {
    substrate: "pet-film",
    webTension: 38,
    dryerTemperature: 120,
    pressSpeed: 760,
    inkChannels: {
      C: { aniloxVolume: 4.5, viscosity: 31, strength: 104, impression: 67 },
      M: { aniloxVolume: 4.5, viscosity: 31, strength: 104, impression: 67 },
      Y: { aniloxVolume: 4.5, viscosity: 31, strength: 104, impression: 67 },
      K: { aniloxVolume: 4.5, viscosity: 31, strength: 104, impression: 67 },
    },
    registration: {
      C: { x: -1.4, y:  0.4 },
      M: { x:  0.8, y: -0.6 },
      Y: { x:  0.3, y:  0.9 },
      K: { x:  0,   y:  0   },
    },
  },
};

export const starterJob = snackPouchJob;

const LABEL_PROCESS_CHANNELS: ChannelDef[] = [
  { id: "C", name: "Cyan",    isProcess: true, displayColor: "#00bef0", screenAngle: 15, artworkZones: [], initiallyActive: true, targetDensity: 1.3  },
  { id: "M", name: "Magenta", isProcess: true, displayColor: "#e0009a", screenAngle: 75, artworkZones: [], initiallyActive: true, targetDensity: 1.3  },
  { id: "Y", name: "Yellow",  isProcess: true, displayColor: "#c89400", screenAngle:  0, artworkZones: [], initiallyActive: true, targetDensity: 0.95 },
  { id: "K", name: "Black",   isProcess: true, displayColor: "#222222", screenAngle: 45, artworkZones: [], initiallyActive: true, targetDensity: 1.5  },
];

export const labelPrintJob: JobPreset = {
  id: "label-print",
  name: "Pressure-Sensitive Label",
  description: "Four-color label job on white BOPP with tighter speed tolerances.",
  substrateOptions: ["opp-film", "paper-laminate"],
  channels: LABEL_PROCESS_CHANNELS,
  ranges: {
    webTension:       { min: 15,  max: 60,   step: 1,  unit: "pli", label: "Web tension" },
    dryerTemperature: { min: 70,  max: 160,  step: 5,  unit: "F",   label: "Dryer temperature" },
    pressSpeed:       { min: 200, max: 800,  step: 10, unit: "fpm", label: "Press speed" },
  },
  inkChannelRanges: {
    aniloxVolume: { min: 1.8, max: 4.5, step: 0.1, unit: "BCM", label: "Anilox volume" },
    viscosity:    { min: 18,  max: 40,  step: 1,   unit: "s",   label: "Viscosity" },
    strength:     { min: 70,  max: 120, step: 1,   unit: "%",   label: "Strength" },
    impression:   { min: 0,   max: 100, step: 1,   unit: "%",   label: "Impression" },
  },
  target: {
    density: 1.28,
    gain: 0,
    dryingCapacity: 0.68,
    tension: 35,
    speed: 450,
    aniloxVolume: 2.8,
    viscosity: 24,
    impression: 50,
  },
  initialSettings: {
    substrate: "opp-film",
    webTension: 28,
    dryerTemperature: 110,
    pressSpeed: 580,
    inkChannels: {
      C: { aniloxVolume: 3.8, viscosity: 28, strength: 100, impression: 62 },
      M: { aniloxVolume: 3.8, viscosity: 28, strength: 100, impression: 62 },
      Y: { aniloxVolume: 3.8, viscosity: 28, strength: 100, impression: 62 },
      K: { aniloxVolume: 3.8, viscosity: 28, strength: 100, impression: 62 },
    },
    registration: {
      C: { x: -0.8, y:  0.3 },
      M: { x:  0.5, y: -0.4 },
      Y: { x:  0.2, y:  0.6 },
      K: { x:  0,   y:  0   },
    },
  },
};

export const JOB_REGISTRY: readonly JobPreset[] = [snackPouchJob, labelPrintJob];
