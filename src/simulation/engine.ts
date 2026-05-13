import type {
  CoachingMessage,
  DefectSeverity,
  InkChannelKey,
  JobPreset,
  PressSettings,
  Registration,
  SimulationOutcome,
} from "../domain/types";

const INK_CHANNELS: InkChannelKey[] = ["C", "M", "Y", "K"];

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
  const speedLoad = settings.pressSpeed / job.target.speed;
  const dryerCapacity = clamp01((settings.dryerTemperature - 80) / 100);
  const tensionError = scale(settings.webTension, job.target.tension, 34);
  const registerError = registrationMagnitude(settings.registration);

  // Per-channel density and gain
  const channelDensity = {} as Record<InkChannelKey, number>;
  const channelGain = {} as Record<InkChannelKey, number>;

  // Accumulate sums for channel means
  let sumImpression = 0;
  let sumStrength = 0;
  let sumViscosity = 0;
  let sumAniloxVolume = 0;
  let sumDensity = 0;
  let sumGain = 0;

  for (const ch of INK_CHANNELS) {
    const ink = settings.inkChannels[ch];
    const aniloxLoadCh     = ink.aniloxVolume / job.target.aniloxVolume;
    const impressionHighCh = clamp01((ink.impression - job.target.impression) / 42);
    const impressionLowCh  = clamp01((job.target.impression - ink.impression) / 38);
    const inkStrengthLoadCh = ink.strength / 100;
    // Viscosity contribution is relative to target — zero at target, positive above
    const viscosityDeltaCh  = (ink.viscosity / job.target.viscosity) - 1;

    const targetDensityCh = job.target.channelTargetDensity[ch];
    channelDensity[ch] = Number(Math.max(
      0.35,
      targetDensityCh * (aniloxLoadCh * inkStrengthLoadCh * (1 - impressionLowCh * 0.42) + impressionHighCh * 0.08),
    ).toFixed(2));

    // SCTV: 0% at ideal settings; positive = dot gain, negative = dot loss
    channelGain[ch] = Number((
      impressionHighCh * 0.34 - impressionLowCh * 0.15 + viscosityDeltaCh * 0.03
    ).toFixed(2));

    sumImpression   += ink.impression;
    sumStrength     += ink.strength;
    sumViscosity    += ink.viscosity;
    sumAniloxVolume += ink.aniloxVolume;
    sumDensity      += channelDensity[ch];
    sumGain         += channelGain[ch];
  }

  const n = INK_CHANNELS.length;
  const density = Number((sumDensity / n).toFixed(2));
  const gain    = Number((sumGain    / n).toFixed(2));

  const meanImpression   = sumImpression   / n;
  const meanStrength     = sumStrength     / n;
  const meanViscosity    = sumViscosity    / n;
  const meanAniloxVolume = sumAniloxVolume / n;

  const impressionHigh  = clamp01((meanImpression - job.target.impression) / 42);
  const impressionLow   = clamp01((job.target.impression - meanImpression) / 38);
  // Viscosity and anilox loads relative to target (0 = at target)
  const viscosityDelta  = meanViscosity / job.target.viscosity - 1;
  const inkStrengthLoad = meanStrength / 100;
  const meanAniloxLoad  = meanAniloxVolume / job.target.aniloxVolume;

  const dryingDemand = clamp01((meanAniloxLoad * inkStrengthLoad * speedLoad) / 1.8);
  const dryingRisk   = clamp01(dryingDemand - dryerCapacity * job.target.dryingCapacity);

  const defects: DefectSeverity = {
    // Pinholes: low impression or anilox away from target
    pinholes:   toSeverity(impressionLow * 0.9 + scale(meanAniloxVolume, job.target.aniloxVolume, 3.2) * 0.12),
    // dirtyPrint: excess impression or viscosity above target
    dirtyPrint: toSeverity(impressionHigh * 0.82 + Math.max(0, viscosityDelta) * 0.08),
    mottle:     toSeverity(scale(meanViscosity, job.target.viscosity, 18) * 0.55 + dryingRisk * 0.28),
    skips:      toSeverity(impressionLow * 0.7 + tensionError * 0.3),
    edgeSquash: toSeverity(impressionHigh * 0.92),
  };

  const channelDensityError = INK_CHANNELS.reduce(
    (sum, ch) => sum + Math.abs(channelDensity[ch] - job.target.channelTargetDensity[ch]),
    0,
  ) / INK_CHANNELS.length;

  const penalties =
    channelDensityError * 26 +
    Math.abs(gain) * 70 +
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
    density,
    gain,
    channelDensity,
    channelGain,
    registerError: Number(registerError.toFixed(2)),
    dryingRisk: Math.round(dryingRisk * 100),
    wasteRate,
    setupQuality,
    defects,
    coaching,
  };
}
