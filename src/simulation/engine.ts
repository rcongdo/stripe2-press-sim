import type {
  CoachingMessage,
  DefectSeverity,
  JobPreset,
  PressSettings,
  Registration,
  SimulationOutcome,
} from "../domain/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scale(value: number, target: number, tolerance: number): number {
  return Math.abs(value - target) / tolerance;
}

function registrationMagnitude(registration: Registration): number {
  const values = Object.values(registration);
  const sum = values.reduce((total, value) => total + value * value, 0);
  return Math.sqrt(sum);
}

function toSeverity(value: number): number {
  return Math.round(clamp01(value) * 100);
}

export function simulatePress(job: JobPreset, settings: PressSettings): SimulationOutcome {
  const impressionHigh = clamp01((settings.impression - job.target.impression) / 42);
  const impressionLow = clamp01((job.target.impression - settings.impression) / 38);
  const aniloxLoad = settings.aniloxVolume / job.target.aniloxVolume;
  const viscosityLoad = settings.inkViscosity / job.target.inkViscosity;
  const inkStrengthLoad = settings.inkStrength / 100;
  const speedLoad = settings.pressSpeed / job.target.speed;
  const dryerCapacity = clamp01((settings.dryerTemperature - 80) / 100);
  const tensionError = scale(settings.webTension, job.target.tension, 34);
  const registerError = registrationMagnitude(settings.registration);

  const density = Math.max(
    0.35,
    1 * aniloxLoad * inkStrengthLoad * (1 - impressionLow * 0.42) + impressionHigh * 0.08,
  );
  const gain = Math.max(0.05, job.target.gain + impressionHigh * 0.34 + viscosityLoad * 0.03);
  const dryingDemand = clamp01((aniloxLoad * inkStrengthLoad * speedLoad) / 1.8);
  const dryingRisk = clamp01(dryingDemand - dryerCapacity * job.target.dryingCapacity);

  const defects: DefectSeverity = {
    pinholes: toSeverity(impressionLow * 0.9 + scale(settings.aniloxVolume, 2.4, 3.2) * 0.12),
    dirtyPrint: toSeverity(impressionHigh * 0.82 + viscosityLoad * 0.08),
    mottle: toSeverity(scale(settings.inkViscosity, job.target.inkViscosity, 18) * 0.55 + dryingRisk * 0.28),
    skips: toSeverity(impressionLow * 0.7 + tensionError * 0.3),
    edgeSquash: toSeverity(impressionHigh * 0.92),
  };

  const penalties =
    Math.abs(density - job.target.density) * 26 +
    Math.abs(gain - job.target.gain) * 70 +
    registerError * 8 +
    dryingRisk * 22 +
    tensionError * 10 +
    Object.values(defects).reduce((total, value) => total + value, 0) * 0.08;

  const setupQuality = Math.round(Math.max(0, 100 - penalties));
  const wasteRate = Math.round(
    18 + (100 - setupQuality) * 1.5 + settings.pressSpeed / 100 + dryingRisk * 45,
  );

  const coaching: CoachingMessage[] = [];
  if (impressionHigh > 0.35) {
    coaching.push({
      id: "impression-heavy",
      level: "warning",
      text: "Impression is heavy; watch for gain, dirty print, and edge squash.",
    });
  }
  if (impressionLow > 0.3) {
    coaching.push({
      id: "impression-light",
      level: "warning",
      text: "Impression is light; expect weak transfer, skips, or pinholes.",
    });
  }
  if (dryingRisk > 0.25) {
    coaching.push({
      id: "drying-risk",
      level: "warning",
      text: "Drying risk is climbing; reduce speed or ink load, or increase dryer temperature.",
    });
  }
  if (registerError > 0.65) {
    coaching.push({
      id: "registration-offset",
      level: "warning",
      text: "Registration is visibly off target. Bring color offsets closer to zero.",
    });
  }
  if (setupQuality >= 90) {
    coaching.push({
      id: "press-ready",
      level: "success",
      text: "The setup is inside the press-ready window.",
    });
  }

  return {
    density: Number(density.toFixed(2)),
    gain: Number(gain.toFixed(2)),
    registerError: Number(registerError.toFixed(2)),
    dryingRisk: Math.round(dryingRisk * 100),
    wasteRate,
    setupQuality,
    defects,
    coaching,
  };
}
