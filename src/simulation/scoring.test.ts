import { describe, expect, it } from "vitest";
import type { SimulationOutcome } from "../domain/types";
import { filterCoaching, scoreRun } from "./scoring";

const strongOutcome: SimulationOutcome = {
  density: 1,
  gain: 0.18,
  registerError: 0.1,
  dryingRisk: 4,
  wasteRate: 28,
  setupQuality: 94,
  defects: { pinholes: 4, dirtyPrint: 5, mottle: 5, skips: 3, edgeSquash: 2 },
  coaching: [{ id: "press-ready", level: "success", text: "The setup is inside the press-ready window." }],
};

describe("scoreRun", () => {
  it("returns a press-ready score for strong outcomes", () => {
    const score = scoreRun(strongOutcome);

    expect(score.totalScore).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("Press ready");
  });

  it("penalizes high waste and poor setup quality", () => {
    const score = scoreRun({ ...strongOutcome, setupQuality: 55, wasteRate: 140 });

    expect(score.totalScore).toBeLessThan(75);
    expect(score.grade).toBe("Needs work");
  });
});

describe("filterCoaching", () => {
  it("hides coaching in practice mode but keeps warnings available in guided mode", () => {
    expect(filterCoaching(strongOutcome.coaching, "practice")).toEqual([]);
    expect(filterCoaching(strongOutcome.coaching, "guided")).toHaveLength(1);
  });
});
