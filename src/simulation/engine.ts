import type {
  CoachingMessage,
  DefectSeverity,
  JobPreset,
  PressSettings,
  SimulationOutcome,
} from "../domain/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scale(value: number, target: number, tolerance: number): number {
  return Math.abs(value - target) / tolerance;
}

function toSeverity(value: number): number {
  return Math.round(clamp01(value) * 100);
}

// Impression thresholds (press-physics constants, not job-specific)
const IMP_START  = 15;   // below this: zero ink transfer
const IMP_TARGET = 60;   // ideal impression — full transfer, zero gain
const IMP_GAIN_MAX = 0.20; // gain caps at 20% at full over-impression

export function simulatePress(job: JobPreset, settings: PressSettings): SimulationOutcome {
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);

  const speedLoad = settings.pressSpeed / job.target.speed;
  const dryerCapacity = clamp01((settings.dryerTemperature - 80) / 100);
  const tensionError = scale(settings.webTension, job.target.tension, 34);

  // Registration error: RMS across all active channels' X and Y offsets
  const regValues = activeChannels.flatMap(ch => {
    const reg = settings.registration[ch.id] ?? { x: 0, y: 0 };
    return [reg.x, reg.y];
  });
  const registerError = Math.sqrt(
    regValues.reduce((sum, v) => sum + v * v, 0)
  );

  const channelDensity: Record<string, number> = {};
  const channelGain: Record<string, number> = {};

  let sumImpression = 0, sumStrength = 0, sumViscosity = 0;
  let sumAniloxVolume = 0, sumDensity = 0, sumGain = 0;

  for (const ch of activeChannels) {
    const ink = settings.inkChannels[ch.id];
    const imp = ink.impression;

    const aniloxLoadCh      = ink.aniloxVolume / job.target.aniloxVolume;
    const inkStrengthLoadCh = ink.strength / 100;
    const viscosityDeltaCh  = (ink.viscosity / job.target.viscosity) - 1;

    // Transfer factor: 0 below IMP_START, ramps 0→1 from IMP_START→IMP_TARGET
    const impTransferCh = imp < IMP_START
      ? 0
      : clamp01((imp - IMP_START) / (IMP_TARGET - IMP_START));

    // Over-impression factor: 0 at ≤IMP_TARGET, ramps 0→1 from IMP_TARGET→100
    const impOverCh = clamp01((imp - IMP_TARGET) / (100 - IMP_TARGET));

    channelDensity[ch.id] = Number(Math.max(0,
      ch.targetDensity * aniloxLoadCh * inkStrengthLoadCh * impTransferCh,
    ).toFixed(2));

    // Gain increases with over-impression (capped at 20%); slight viscosity effect
    channelGain[ch.id] = Number(
      Math.min(IMP_GAIN_MAX, Math.max(-0.05, impOverCh * IMP_GAIN_MAX + viscosityDeltaCh * 0.03))
    .toFixed(2));

    sumImpression   += imp;
    sumStrength     += ink.strength;
    sumViscosity    += ink.viscosity;
    sumAniloxVolume += ink.aniloxVolume;
    sumDensity      += channelDensity[ch.id];
    sumGain         += channelGain[ch.id];
  }

  const n = activeChannels.length || 1;
  const density = Number((sumDensity / n).toFixed(2));
  const gain    = Number((sumGain    / n).toFixed(2));

  const meanImpression   = sumImpression   / n;
  const meanStrength     = sumStrength     / n;
  const meanViscosity    = sumViscosity    / n;
  const meanAniloxVolume = sumAniloxVolume / n;

  // Aggregate impression factors
  const meanImpTransfer = meanImpression < IMP_START
    ? 0
    : clamp01((meanImpression - IMP_START) / (IMP_TARGET - IMP_START));
  const impressionHigh = clamp01((meanImpression - IMP_TARGET) / (100 - IMP_TARGET));
  const impressionLow  = 1 - meanImpTransfer; // 1.0 = no transfer, 0.0 = ideal

  // Blotchy factor: peaks mid-transition (partial printing zone)
  const blotch = meanImpTransfer > 0 && meanImpTransfer < 1
    ? 4 * meanImpTransfer * (1 - meanImpTransfer)
    : 0;

  const viscosityDelta  = meanViscosity / job.target.viscosity - 1;
  const inkStrengthLoad = meanStrength / 100;
  const meanAniloxLoad  = meanAniloxVolume / job.target.aniloxVolume;

  const dryingDemand = clamp01((meanAniloxLoad * inkStrengthLoad * speedLoad) / 1.8);
  const dryingRisk   = clamp01(dryingDemand - dryerCapacity * job.target.dryingCapacity);

  const defects: DefectSeverity = {
    pinholes:   toSeverity(impressionLow * 0.9 + scale(meanAniloxVolume, job.target.aniloxVolume, 3.2) * 0.12),
    dirtyPrint: toSeverity(impressionHigh * 0.82 + Math.max(0, viscosityDelta) * 0.08),
    mottle:     toSeverity(blotch * 0.6 + scale(meanViscosity, job.target.viscosity, 18) * 0.3 + dryingRisk * 0.28),
    skips:      toSeverity(impressionLow * 0.7 + tensionError * 0.3),
    edgeSquash: toSeverity(impressionHigh * 0.92),
  };

  const channelDensityError = activeChannels.reduce(
    (sum, ch) => sum + Math.abs(channelDensity[ch.id] - ch.targetDensity),
    0,
  ) / n;

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
  if (impressionHigh > 0.35) coaching.push({ id: "impression-heavy", level: "warning", text: "Impression is heavy; watch for gain, dirty print, and edge squash." });
  if (impressionLow  > 0.3)  coaching.push({ id: "impression-light", level: "warning", text: "Impression is light; expect weak transfer, skips, or pinholes." });
  if (dryingRisk     > 0.25) coaching.push({ id: "drying-risk",      level: "warning", text: "Drying risk is climbing; reduce speed or ink load, or increase dryer temperature." });
  if (registerError  > 0.65) coaching.push({ id: "registration-offset", level: "warning", text: "Registration is visibly off target. Bring color offsets closer to zero." });
  if (setupQuality   >= 90)  coaching.push({ id: "press-ready",      level: "success", text: "The setup is inside the press-ready window." });

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
