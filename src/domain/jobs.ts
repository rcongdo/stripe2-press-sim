import type { AniloxPreset, JobPreset } from "./types";

export const aniloxPresets: AniloxPreset[] = [
  { id: "ultra-fine",   label: "Ultra-fine — 1400 lpi / 1.8 BCM",  lineScreen: 1400, volume: 1.8 },
  { id: "fine",         label: "Fine — 1200 lpi / 2.4 BCM",        lineScreen: 1200, volume: 2.4 },
  { id: "standard",     label: "Standard — 1000 lpi / 3.2 BCM",    lineScreen: 1000, volume: 3.2 },
  { id: "medium-heavy", label: "Medium-heavy — 900 lpi / 3.8 BCM", lineScreen: 900,  volume: 3.8 },
  { id: "heavy",        label: "Heavy — 800 lpi / 4.5 BCM",        lineScreen: 800,  volume: 4.5 },
  { id: "very-heavy",   label: "Very heavy — 700 lpi / 5.2 BCM",   lineScreen: 700,  volume: 5.2 },
];

export const starterJob: JobPreset = {
  id: "snack-pouch-cmyk",
  name: "Snack Pouch Film",
  description: "Four-color process setup on PET film for a flexible packaging job.",
  substrateOptions: ["pet-film", "opp-film", "paper-laminate"],
  ranges: {
    aniloxVolume:     { min: 1.8, max: 5.5,  step: 0.1, unit: "BCM", label: "Anilox volume" },
    aniloxLineScreen: { min: 700, max: 1400,  step: 50,  unit: "lpi", label: "Anilox line screen" },
    inkViscosity:     { min: 18,  max: 45,    step: 1,   unit: "s",   label: "Ink viscosity" },
    inkStrength:      { min: 70,  max: 120,   step: 1,   unit: "%",   label: "Ink strength" },
    impression:       { min: 0,   max: 100,   step: 1,   unit: "%",   label: "Impression" },
    webTension:       { min: 20,  max: 80,    step: 1,   unit: "pli", label: "Web tension" },
    dryerTemperature: { min: 80,  max: 180,   step: 5,   unit: "F",   label: "Dryer temperature" },
    pressSpeed:       { min: 300, max: 1200,  step: 10,  unit: "fpm", label: "Press speed" },
  },
  target: {
    density: 1,
    gain: 0.18,
    dryingCapacity: 0.72,
    tension: 50,
    speed: 650,
    aniloxVolume: 3.2,
    inkViscosity: 28,
    impression: 54,
  },
  initialSettings: {
    substrate: "pet-film",
    aniloxVolume: 4.5,
    aniloxLineScreen: 800,
    inkViscosity: 31,
    inkStrength: 104,
    impression: 67,
    webTension: 38,
    dryerTemperature: 120,
    pressSpeed: 760,
    registration: {
      cyanX: -1.4,
      cyanY: 0.4,
      magentaX: 0.8,
      magentaY: -0.6,
      yellowX: 0.3,
      yellowY: 0.9,
      blackX: 0,
      blackY: 0,
    },
  },
};
