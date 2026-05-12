import type { CoachingMessage, ScoreSummary, SimulationOutcome } from "../domain/types";

export type TrainingMode = "guided" | "practice";

function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function scoreRun(outcome: SimulationOutcome): ScoreSummary {
  const qualityScore = clampScore(outcome.setupQuality);
  const wasteScore = clampScore(100 - Math.max(0, outcome.wasteRate - 20) * 0.55);
  const defectAverage =
    Object.values(outcome.defects).reduce((total, value) => total + value, 0) /
    Object.values(outcome.defects).length;
  const stabilityScore = clampScore(
    100 - outcome.registerError * 10 - outcome.dryingRisk * 0.45 - defectAverage * 0.35,
  );
  const totalScore = clampScore(qualityScore * 0.5 + wasteScore * 0.2 + stabilityScore * 0.3);
  const grade =
    totalScore >= 88 ? "Press ready" : totalScore >= 72 ? "Getting close" : "Needs work";

  return {
    qualityScore,
    wasteScore,
    stabilityScore,
    totalScore,
    grade,
  };
}

export function filterCoaching(
  coaching: CoachingMessage[],
  mode: TrainingMode,
): CoachingMessage[] {
  return mode === "practice" ? [] : coaching;
}
