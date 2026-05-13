# Per-Color Ink Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three global ink sliders (viscosity, strength, impression) with per-CMYK-channel controls, compute density and gain independently per channel in the simulation engine, and pass per-channel values to the canvas renderer.

**Architecture:** Add `InkChannelSettings` types and `inkChannels` to `PressSettings` (additive in Task 1, old keys removed in Task 3). Engine computes `channelDensity`/`channelGain` per channel; `density`/`gain` become their means. `drawPlate` already takes density/gain as parameters — call site switches to per-channel values. `ControlPanel` gains a new Ink section (color selector + 3 sliders) identical in style to the Registration section.

**Tech Stack:** React 19, TypeScript, Canvas 2D API, Vitest + Testing Library

---

## Files Changed

| File | Change |
|------|--------|
| `src/domain/types.ts` | Add `InkChannelKey`, `InkChannelSettings`, `InkChannelSettingKey`; update `PressSettings`, `SimulationOutcome`, `JobPreset`; remove 3 keys from `PressSettingKey` (Task 3) |
| `src/domain/jobs.ts` | Add `inkChannelRanges` + `inkChannels` to `starterJob`; remove old global ink keys (Task 3) |
| `src/domain/settings.ts` | Add `updateInkChannelSetting` |
| `src/domain/settings.test.ts` | Add `updateInkChannelSetting` tests; update tests that used old ink keys (Task 3) |
| `src/simulation/engine.ts` | Per-channel density/gain loop; global mean-based defects/drying |
| `src/simulation/engine.test.ts` | Update 4 existing tests to use `inkChannels`; add 3 per-channel tests |
| `src/simulation/scoring.test.ts` | Add `channelDensity`/`channelGain` to `strongOutcome` fixture |
| `src/components/PrintPreview.tsx` | One-line change: pass `channelGain[ch]`/`channelDensity[ch]` to `drawPlate` |
| `src/components/ControlPanel.tsx` | Add `onInkChannelChange` prop; add Ink section; shrink global sliders to 3; add `role="group"` to color pickers |
| `src/components/ControlPanel.test.tsx` | Update 4 registration tests to scope via `within`; add 3 ink tests; add `onInkChannelChange` to `makeProps` |
| `src/App.tsx` | Add `handleInkChannelChange`; wire to `ControlPanel` |

---

### Task 1: Additive domain types + `updateInkChannelSetting`

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/jobs.ts`
- Modify: `src/domain/settings.ts`
- Test: `src/domain/settings.test.ts`

This task is purely additive — the three existing global ink keys (`inkViscosity`, `inkStrength`, `impression`) are **not** removed yet. The engine and all existing tests continue to work unchanged.

- [ ] **Step 1: Verify baseline — all 33 tests pass**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `33 passed`. Stop and report BLOCKED if any fail.

- [ ] **Step 2: Add new types to `src/domain/types.ts`**

After the `RegistrationKey` type (around line 13), add:

```ts
export type InkChannelKey = "C" | "M" | "Y" | "K";

export type InkChannelSettings = {
  viscosity: number;
  strength: number;
  impression: number;
};

export type InkChannelSettingKey = keyof InkChannelSettings;
```

Update `PressSettings` (keep old `Record<PressSettingKey, number>` which still includes the 3 global keys — add `inkChannels` alongside):

```ts
export type PressSettings = Record<PressSettingKey, number> & {
  substrate: SubstrateId;
  registration: Registration;
  inkChannels: Record<InkChannelKey, InkChannelSettings>;
};
```

Update `SimulationOutcome` — add two new fields after `gain`:

```ts
export type SimulationOutcome = {
  density: number;
  gain: number;
  channelDensity: Record<InkChannelKey, number>;
  channelGain: Record<InkChannelKey, number>;
  registerError: number;
  dryingRisk: number;
  wasteRate: number;
  setupQuality: number;
  defects: DefectSeverity;
  coaching: CoachingMessage[];
};
```

Update `JobPreset` — add `inkChannelRanges` after `ranges`:

```ts
export type JobPreset = {
  id: string;
  name: string;
  description: string;
  substrateOptions: SubstrateId[];
  ranges: Record<PressSettingKey, SettingRange>;
  inkChannelRanges: {
    viscosity: SettingRange;
    strength: SettingRange;
    impression: SettingRange;
  };
  initialSettings: PressSettings;
  target: JobTarget;
};
```

- [ ] **Step 3: Update `src/domain/jobs.ts`**

Add `inkChannelRanges` to `starterJob` between `ranges` and `target`:

```ts
inkChannelRanges: {
  viscosity:  { min: 18, max: 45,  step: 1, unit: "s",  label: "Viscosity"  },
  strength:   { min: 70, max: 120, step: 1, unit: "%",  label: "Strength"   },
  impression: { min: 0,  max: 100, step: 1, unit: "%",  label: "Impression" },
},
```

Add `inkChannels` to `starterJob.initialSettings` (keep existing `inkViscosity`, `inkStrength`, `impression` entries for now):

```ts
inkChannels: {
  C: { viscosity: 31, strength: 104, impression: 67 },
  M: { viscosity: 31, strength: 104, impression: 67 },
  Y: { viscosity: 31, strength: 104, impression: 67 },
  K: { viscosity: 31, strength: 104, impression: 67 },
},
```

- [ ] **Step 4: Add `updateInkChannelSetting` to `src/domain/settings.ts`**

Update the import at the top to include the new types:

```ts
import type { InkChannelKey, InkChannelSettingKey, JobPreset, PressSettingKey, PressSettings } from "./types";
```

Add after `updateSetting`:

```ts
export function updateInkChannelSetting(
  job: JobPreset,
  settings: PressSettings,
  channel: InkChannelKey,
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
```

- [ ] **Step 5: Write failing tests for `updateInkChannelSetting` in `src/domain/settings.test.ts`**

Update the import at the top:

```ts
import { clampSetting, createInitialSettings, updateInkChannelSetting, updateSetting } from "./settings";
```

Add a new `describe` block after the existing ones:

```ts
describe("updateInkChannelSetting", () => {
  it("clamps viscosity above range max", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "C", "viscosity", 99);
    expect(result.inkChannels.C.viscosity).toBe(45);
  });

  it("clamps impression below range min", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "M", "impression", -5);
    expect(result.inkChannels.M.impression).toBe(0);
  });

  it("does not affect other channels", () => {
    const settings = createInitialSettings(starterJob);
    const result = updateInkChannelSetting(starterJob, settings, "C", "viscosity", 25);
    expect(result.inkChannels.M.viscosity).toBe(settings.inkChannels.M.viscosity);
    expect(result.inkChannels.Y.viscosity).toBe(settings.inkChannels.Y.viscosity);
    expect(result.inkChannels.K.viscosity).toBe(settings.inkChannels.K.viscosity);
  });

  it("does not mutate the original settings object", () => {
    const settings = createInitialSettings(starterJob);
    const original = settings.inkChannels.C.viscosity;
    updateInkChannelSetting(starterJob, settings, "C", "viscosity", 40);
    expect(settings.inkChannels.C.viscosity).toBe(original);
  });
});
```

- [ ] **Step 6: Run tests — expect 37 passing (33 + 4 new)**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `37 passed`.

- [ ] **Step 7: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: per-color ink channel types and updateInkChannelSetting"
```

---

### Task 2: Engine per-channel density/gain

**Files:**
- Modify: `src/simulation/engine.ts`
- Modify: `src/simulation/engine.test.ts`
- Modify: `src/simulation/scoring.test.ts`

The engine switches from reading `settings.inkViscosity/inkStrength/impression` (global) to reading `settings.inkChannels[ch]` per channel. Defects and drying risk use channel means. Existing engine tests are updated to pass `inkChannels` instead of top-level overrides.

- [ ] **Step 1: Write 3 new failing engine tests in `src/simulation/engine.test.ts`**

Add a helper function at the top of the file (after the imports):

```ts
function allChannels(viscosity: number, strength: number, impression: number) {
  return {
    C: { viscosity, strength, impression },
    M: { viscosity, strength, impression },
    Y: { viscosity, strength, impression },
    K: { viscosity, strength, impression },
  };
}
```

Add at the end of the `describe("simulatePress")` block:

```ts
it("channels with different strengths produce different channelDensity values", () => {
  const base = createInitialSettings(starterJob);
  const lowC = { ...base, inkChannels: { ...base.inkChannels, C: { viscosity: 28, strength: 70, impression: 54 } } };
  const highC = { ...base, inkChannels: { ...base.inkChannels, C: { viscosity: 28, strength: 120, impression: 54 } } };
  expect(simulatePress(starterJob, highC).channelDensity.C).toBeGreaterThan(
    simulatePress(starterJob, lowC).channelDensity.C,
  );
});

it("density equals the mean of all channelDensity values", () => {
  const outcome = simulatePress(starterJob, createInitialSettings(starterJob));
  const mean =
    (outcome.channelDensity.C + outcome.channelDensity.M +
     outcome.channelDensity.Y + outcome.channelDensity.K) / 4;
  expect(outcome.density).toBeCloseTo(mean, 2);
});

it("higher impression on one channel raises its channelGain without affecting others", () => {
  const base = createInitialSettings(starterJob);
  const highK = {
    ...base,
    inkChannels: { ...base.inkChannels, K: { viscosity: 28, strength: 100, impression: 90 } },
  };
  const baseOutcome = simulatePress(starterJob, base);
  const highKOutcome = simulatePress(starterJob, highK);
  expect(highKOutcome.channelGain.K).toBeGreaterThan(baseOutcome.channelGain.K);
  expect(highKOutcome.channelGain.C).toBeCloseTo(baseOutcome.channelGain.C, 2);
});
```

- [ ] **Step 2: Run tests — confirm the 3 new tests fail**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run --reporter=verbose 2>&1 | grep -E "✓|×" | head -20
```

Expected: 3 new tests fail (channelDensity undefined), 37 others pass.

- [ ] **Step 3: Rewrite `src/simulation/engine.ts`**

Replace the entire file with:

```ts
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
  const aniloxLoad = settings.aniloxVolume / job.target.aniloxVolume;
  const speedLoad = settings.pressSpeed / job.target.speed;
  const dryerCapacity = clamp01((settings.dryerTemperature - 80) / 100);
  const tensionError = scale(settings.webTension, job.target.tension, 34);
  const registerError = registrationMagnitude(settings.registration);

  // Per-channel density and gain
  const channelDensity = {} as Record<InkChannelKey, number>;
  const channelGain = {} as Record<InkChannelKey, number>;

  for (const ch of INK_CHANNELS) {
    const ink = settings.inkChannels[ch];
    const impressionHighCh = clamp01((ink.impression - job.target.impression) / 42);
    const impressionLowCh  = clamp01((job.target.impression - ink.impression) / 38);
    const inkStrengthLoadCh = ink.strength / 100;
    const viscosityLoadCh   = ink.viscosity / job.target.inkViscosity;

    channelDensity[ch] = Number(Math.max(
      0.35,
      1 * aniloxLoad * inkStrengthLoadCh * (1 - impressionLowCh * 0.42) + impressionHighCh * 0.08,
    ).toFixed(2));

    channelGain[ch] = Number(Math.max(
      0.05,
      job.target.gain + impressionHighCh * 0.34 + viscosityLoadCh * 0.03,
    ).toFixed(2));
  }

  const density = Number(
    (INK_CHANNELS.reduce((s, ch) => s + channelDensity[ch], 0) / 4).toFixed(2),
  );
  const gain = Number(
    (INK_CHANNELS.reduce((s, ch) => s + channelGain[ch], 0) / 4).toFixed(2),
  );

  // Global metrics use channel means
  const meanImpression = INK_CHANNELS.reduce((s, ch) => s + settings.inkChannels[ch].impression, 0) / 4;
  const meanStrength   = INK_CHANNELS.reduce((s, ch) => s + settings.inkChannels[ch].strength,   0) / 4;
  const meanViscosity  = INK_CHANNELS.reduce((s, ch) => s + settings.inkChannels[ch].viscosity,  0) / 4;

  const impressionHigh = clamp01((meanImpression - job.target.impression) / 42);
  const impressionLow  = clamp01((job.target.impression - meanImpression) / 38);
  const viscosityLoad  = meanViscosity / job.target.inkViscosity;
  const inkStrengthLoad = meanStrength / 100;

  const dryingDemand = clamp01((aniloxLoad * inkStrengthLoad * speedLoad) / 1.8);
  const dryingRisk   = clamp01(dryingDemand - dryerCapacity * job.target.dryingCapacity);

  const defects: DefectSeverity = {
    pinholes:   toSeverity(impressionLow * 0.9 + scale(settings.aniloxVolume, 2.4, 3.2) * 0.12),
    dirtyPrint: toSeverity(impressionHigh * 0.82 + viscosityLoad * 0.08),
    mottle:     toSeverity(scale(meanViscosity, job.target.inkViscosity, 18) * 0.55 + dryingRisk * 0.28),
    skips:      toSeverity(impressionLow * 0.7 + tensionError * 0.3),
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
```

- [ ] **Step 4: Update the 4 existing engine tests to use `inkChannels`**

The existing tests pass `impression`, `inkViscosity`, `inkStrength` as top-level overrides, but the engine no longer reads those fields. Replace all 4 existing `it(...)` blocks (lines 7–87) with these — keep the `allChannels` helper and `describe` wrapper, replace the test bodies:

```ts
it("scores a near-target setup as press ready", () => {
  const outcome = simulatePress(starterJob, {
    ...createInitialSettings(starterJob),
    aniloxVolume: 3.2,
    webTension: 50,
    dryerTemperature: 150,
    pressSpeed: 650,
    registration: {
      cyanX: 0, cyanY: 0,
      magentaX: 0, magentaY: 0,
      yellowX: 0, yellowY: 0,
      blackX: 0, blackY: 0,
    },
    inkChannels: allChannels(28, 100, 54),
  });

  expect(outcome.setupQuality).toBeGreaterThanOrEqual(90);
  expect(outcome.defects.pinholes).toBeLessThan(10);
  expect(outcome.defects.dirtyPrint).toBeLessThan(10);
});

it("increases gain and dirty print with excessive impression", () => {
  const base = createInitialSettings(starterJob);
  const normal   = simulatePress(starterJob, { ...base, inkChannels: allChannels(28, 100, 54) });
  const excessive = simulatePress(starterJob, { ...base, inkChannels: allChannels(28, 100, 92) });

  expect(excessive.gain).toBeGreaterThan(normal.gain);
  expect(excessive.defects.dirtyPrint).toBeGreaterThan(normal.defects.dirtyPrint);
});

it("lowers density and increases pinholes with insufficient impression", () => {
  const base = createInitialSettings(starterJob);
  const normal = simulatePress(starterJob, { ...base, inkChannels: allChannels(28, 100, 54) });
  const light  = simulatePress(starterJob, { ...base, inkChannels: allChannels(28, 100, 18) });

  expect(light.density).toBeLessThan(normal.density);
  expect(light.defects.pinholes).toBeGreaterThan(normal.defects.pinholes);
});

it("raises drying risk when speed and ink load exceed drying capacity", () => {
  const base = createInitialSettings(starterJob);
  const controlled = simulatePress(starterJob, {
    ...base,
    pressSpeed: 520,
    aniloxVolume: 3,
    dryerTemperature: 160,
    inkChannels: allChannels(28, 96, 54),
  });
  const risky = simulatePress(starterJob, {
    ...base,
    pressSpeed: 1150,
    aniloxVolume: 5.4,
    dryerTemperature: 90,
    inkChannels: allChannels(28, 118, 54),
  });

  expect(risky.dryingRisk).toBeGreaterThan(controlled.dryingRisk);
  expect(risky.coaching.some((m) => m.id === "drying-risk")).toBe(true);
});

it("reports registration error from color offsets", () => {
  const outcome = simulatePress(starterJob, createInitialSettings(starterJob));

  expect(outcome.registerError).toBeGreaterThan(1);
  expect(outcome.coaching.some((m) => m.id === "registration-offset")).toBe(true);
});
```

- [ ] **Step 5: Update `strongOutcome` fixture in `src/simulation/scoring.test.ts`**

Add `channelDensity` and `channelGain` to the `strongOutcome` object (after `gain`):

```ts
const strongOutcome: SimulationOutcome = {
  density: 1,
  gain: 0.18,
  channelDensity: { C: 1, M: 1, Y: 1, K: 1 },
  channelGain:    { C: 0.18, M: 0.18, Y: 0.18, K: 0.18 },
  registerError: 0.1,
  dryingRisk: 4,
  wasteRate: 28,
  setupQuality: 94,
  defects: { pinholes: 4, dirtyPrint: 5, mottle: 5, skips: 3, edgeSquash: 2 },
  coaching: [{ id: "press-ready", level: "success", text: "The setup is inside the press-ready window." }],
};
```

- [ ] **Step 6: Run tests — expect 40 passing (37 + 3 new)**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `40 passed`.

- [ ] **Step 7: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: per-channel density/gain in simulation engine"
```

---

### Task 3: Remove dead global ink keys

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/jobs.ts`
- Modify: `src/domain/settings.test.ts`
- Modify: `src/components/ControlPanel.tsx`

Remove `inkViscosity`, `inkStrength`, `impression` from `PressSettingKey`. Update everything that referenced them. The engine no longer reads these fields so no engine changes are needed.

- [ ] **Step 1: Remove 3 keys from `PressSettingKey` in `src/domain/types.ts`**

Replace the current `PressSettingKey` definition with:

```ts
export type PressSettingKey =
  | "aniloxVolume"
  | "aniloxLineScreen"
  | "webTension"
  | "dryerTemperature"
  | "pressSpeed";
```

- [ ] **Step 2: Remove the 3 keys from `starterJob` in `src/domain/jobs.ts`**

In `starterJob.ranges`, remove the three entries for `inkViscosity`, `inkStrength`, and `impression`. The `ranges` object should become:

```ts
ranges: {
  aniloxVolume:     { min: 1.8, max: 5.5,  step: 0.1, unit: "BCM", label: "Anilox volume" },
  aniloxLineScreen: { min: 700, max: 1400, step: 50,  unit: "lpi", label: "Anilox line screen" },
  webTension:       { min: 20,  max: 80,   step: 1,   unit: "pli", label: "Web tension" },
  dryerTemperature: { min: 80,  max: 180,  step: 5,   unit: "F",   label: "Dryer temperature" },
  pressSpeed:       { min: 300, max: 1200, step: 10,  unit: "fpm", label: "Press speed" },
},
```

In `starterJob.initialSettings`, remove `inkViscosity: 31`, `inkStrength: 104`, and `impression: 67`. The initialSettings should now contain only: `substrate`, `aniloxVolume`, `aniloxLineScreen`, `webTension`, `dryerTemperature`, `pressSpeed`, `registration`, and `inkChannels`.

- [ ] **Step 3: Update 5 tests in `src/domain/settings.test.ts`**

The tests that used `impression` or `inkViscosity` as `PressSettingKey` values must switch to keys that still exist. Use `webTension` (range: 20–80, initial: 38) and `pressSpeed` (range: 300–1200, initial: 760) as replacements.

Replace the existing 5 tests with these updated versions:

```ts
describe("press setting helpers", () => {
  it("creates imperfect starter settings for the starter job", () => {
    const settings = createInitialSettings(starterJob);

    expect(settings).not.toBe(starterJob.initialSettings);
    expect(settings.registration).not.toBe(starterJob.initialSettings.registration);
    expect(settings.inkChannels.C.impression).toBe(67);
    expect(settings.pressSpeed).toBe(760);
    expect(settings.registration.cyanX).toBe(-1.4);
  });

  it("clamps numeric settings to their configured range", () => {
    expect(clampSetting(starterJob, "webTension", 200)).toBe(80);
    expect(clampSetting(starterJob, "pressSpeed", 100)).toBe(300);
  });

  it("returns the setting minimum for non-finite numeric settings", () => {
    expect(clampSetting(starterJob, "webTension", Number.NaN)).toBe(20);
  });

  it("updates settings without mutating the original object", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "webTension", 60);

    expect(updated).not.toBe(original);
    expect(updated.webTension).toBe(60);
    expect(original.webTension).toBe(38);
  });

  it("clamps updated settings to their configured range", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "webTension", 200);

    expect(updated.webTension).toBe(80);
  });
});
```

- [ ] **Step 4: Shrink `sliderKeys` in `src/components/ControlPanel.tsx`**

Find the `sliderKeys` array (currently includes all 6 keys). Replace it with:

```ts
const sliderKeys: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];
```

- [ ] **Step 5: Run tests — expect 40 passing**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `40 passed`. If TypeScript errors appear, also run:

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 6: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: remove global ink keys; per-channel settings are now the source of truth"
```

---

### Task 4: PrintPreview per-channel `drawPlate` call

**Files:**
- Modify: `src/components/PrintPreview.tsx`

One-line change: the `drawPlate` call site passes `outcome.gain` and `outcome.density` globally today; switch to per-channel values. No test changes are needed — the `PrintPreview` tests derive `outcome` from the real `simulatePress`, which already returns `channelDensity`/`channelGain`.

- [ ] **Step 1: Update the `drawPlate` call in `src/components/PrintPreview.tsx`**

Find this line (inside the `for (const ch of ...)` loop):

```ts
drawPlate(ctx, ch, pouchX, regX, regY, outcome.gain, outcome.density);
```

Replace with:

```ts
drawPlate(ctx, ch, pouchX, regX, regY, outcome.channelGain[ch], outcome.channelDensity[ch]);
```

- [ ] **Step 2: Run tests — expect 40 passing**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `40 passed`.

- [ ] **Step 3: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: pass per-channel density and gain to drawPlate"
```

---

### Task 5: ControlPanel Ink section

**Files:**
- Modify: `src/components/ControlPanel.tsx`
- Modify: `src/components/ControlPanel.test.tsx`

Add a new "Ink" section between Press settings and Registration: color selector (independent from registration) + 3 sliders (Viscosity, Strength, Impression). Both color picker groups get `role="group"` + `aria-label` so tests can scope queries within them. Update `makeProps` and the 4 existing registration tests accordingly.

- [ ] **Step 1: Write 3 new failing tests in `src/components/ControlPanel.test.tsx`**

Add `within` to the import at the top:

```ts
import { within, fireEvent, render, screen } from "@testing-library/react";
```

Add a new `describe` block at the end of the file:

```ts
describe("ControlPanel — ink sliders", () => {
  it("renders sliders for viscosity, strength, and impression", () => {
    render(<ControlPanel {...makeProps()} />);
    expect(screen.getByRole("slider", { name: /viscosity/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /strength/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /impression/i })).toBeInTheDocument();
  });

  it("fires onInkChannelChange with channel C and correct key on slider change", () => {
    const onInkChannelChange = vi.fn();
    render(<ControlPanel {...makeProps({ onInkChannelChange })} />);
    fireEvent.change(screen.getByRole("slider", { name: /viscosity/i }), {
      target: { value: "35" },
    });
    expect(onInkChannelChange).toHaveBeenCalledWith("C", "viscosity", 35);
  });

  it("switching ink color changes the channel fired by onInkChannelChange", () => {
    const onInkChannelChange = vi.fn();
    render(<ControlPanel {...makeProps({ onInkChannelChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /magenta/i }));
    fireEvent.change(screen.getByRole("slider", { name: /impression/i }), {
      target: { value: "60" },
    });
    expect(onInkChannelChange).toHaveBeenCalledWith("M", "impression", 60);
  });
});
```

- [ ] **Step 2: Run tests — confirm 3 new tests fail**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run --reporter=verbose 2>&1 | grep -E "✓|×" | head -30
```

Expected: 3 new ink tests fail; 40 others pass.

- [ ] **Step 3: Update `src/components/ControlPanel.tsx`**

Replace the entire file with:

```tsx
import { useState } from "react";
import { aniloxPresets } from "../domain/jobs";
import type {
  InkChannelKey,
  InkChannelSettingKey,
  JobPreset,
  PressSettingKey,
  PressSettings,
  RegistrationKey,
} from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onAniloxPresetChange: (volume: number, lineScreen: number) => void;
  onRegistrationChange: (key: RegistrationKey, value: number) => void;
  onInkChannelChange: (channel: InkChannelKey, key: InkChannelSettingKey, value: number) => void;
};

type ColorName = "cyan" | "magenta" | "yellow" | "black";

const colorKeys: Record<ColorName, { x: RegistrationKey; y: RegistrationKey }> = {
  cyan:    { x: "cyanX",    y: "cyanY" },
  magenta: { x: "magentaX", y: "magentaY" },
  yellow:  { x: "yellowX",  y: "yellowY" },
  black:   { x: "blackX",   y: "blackY" },
};

const colorSwatches: Record<ColorName, string> = {
  cyan:    "#00a7c8",
  magenta: "#d3266c",
  yellow:  "#c8a000",
  black:   "#202124",
};

const inkChannelMap: Record<ColorName, InkChannelKey> = {
  cyan: "C", magenta: "M", yellow: "Y", black: "K",
};

const sliderKeys: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];

const inkSettingKeys: InkChannelSettingKey[] = ["viscosity", "strength", "impression"];

export function ControlPanel({
  job,
  settings,
  onSettingChange,
  onAniloxPresetChange,
  onRegistrationChange,
  onInkChannelChange,
}: ControlPanelProps) {
  const [selectedColor, setSelectedColor] = useState<ColorName>("cyan");
  const [selectedInkColor, setSelectedInkColor] = useState<ColorName>("cyan");

  const currentPreset =
    aniloxPresets.find((p) => p.volume === settings.aniloxVolume) ??
    aniloxPresets.find((p) => p.id === "heavy")!;

  function nudge(axis: "x" | "y", delta: number) {
    const key = colorKeys[selectedColor][axis];
    const current = settings.registration[key];
    onRegistrationChange(key, Math.min(4, Math.max(-4, parseFloat((current + delta).toFixed(1)))));
  }

  const regX = settings.registration[colorKeys[selectedColor].x];
  const regY = settings.registration[colorKeys[selectedColor].y];

  return (
    <aside className="control-panel" aria-label="Press setup controls">
      <div>
        <p className="panel-label">Job</p>
        <h2>{job.name}</h2>
        <p>{job.description}</p>
      </div>

      <div className="control-group">
        <label className="control anilox-select" htmlFor="anilox-select">
          <span>Anilox roll</span>
          <select
            id="anilox-select"
            value={currentPreset.id}
            onChange={(e) => {
              const preset = aniloxPresets.find((p) => p.id === e.target.value);
              if (preset) onAniloxPresetChange(preset.volume, preset.lineScreen);
            }}
          >
            {aniloxPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="control-group">
        <h3>Press settings</h3>
        {sliderKeys.map((key) => {
          const range = job.ranges[key];
          return (
            <label className="control" key={key}>
              <span>
                {range.label}
                <strong>
                  {settings[key]} {range.unit}
                </strong>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={settings[key]}
                onChange={(e) => onSettingChange(key, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>

      <div className="control-group">
        <h3>Ink</h3>
        <div className="reg-colors" role="group" aria-label="Ink color">
          {(Object.keys(colorKeys) as ColorName[]).map((color) => (
            <button
              key={color}
              type="button"
              className={`reg-color-btn${selectedInkColor === color ? " reg-color-btn--active" : ""}`}
              style={{ "--swatch": colorSwatches[color] } as React.CSSProperties}
              onClick={() => setSelectedInkColor(color)}
              aria-pressed={selectedInkColor === color}
            >
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </button>
          ))}
        </div>
        {inkSettingKeys.map((key) => {
          const range = job.inkChannelRanges[key];
          const ch = inkChannelMap[selectedInkColor];
          return (
            <label className="control" key={key}>
              <span>
                {range.label}
                <strong>
                  {settings.inkChannels[ch][key]} {range.unit}
                </strong>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={settings.inkChannels[ch][key]}
                onChange={(e) => onInkChannelChange(ch, key, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>

      <div className="control-group">
        <h3>Registration</h3>
        <div className="reg-colors" role="group" aria-label="Registration color">
          {(Object.keys(colorKeys) as ColorName[]).map((color) => (
            <button
              key={color}
              type="button"
              className={`reg-color-btn${selectedColor === color ? " reg-color-btn--active" : ""}`}
              style={{ "--swatch": colorSwatches[color] } as React.CSSProperties}
              onClick={() => setSelectedColor(color)}
              aria-pressed={selectedColor === color}
            >
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </button>
          ))}
        </div>
        <div className="reg-readout">
          <span>X: <strong>{regX.toFixed(1)} mil</strong></span>
          <span>Y: <strong>{regY.toFixed(1)} mil</strong></span>
        </div>
        <div className="reg-dpad">
          <button type="button" className="reg-dpad__btn" aria-label="up"    onClick={() => nudge("y", -0.1)}>↑</button>
          <div className="reg-dpad__row">
            <button type="button" className="reg-dpad__btn" aria-label="left"  onClick={() => nudge("x", -0.1)}>←</button>
            <div className="reg-dpad__center" />
            <button type="button" className="reg-dpad__btn" aria-label="right" onClick={() => nudge("x",  0.1)}>→</button>
          </div>
          <button type="button" className="reg-dpad__btn" aria-label="down"  onClick={() => nudge("y",  0.1)}>↓</button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Update `makeProps` and the 5 existing registration tests in `src/components/ControlPanel.test.tsx`**

Update `makeProps` to include `onInkChannelChange`:

```ts
function makeProps(overrides: Partial<Parameters<typeof ControlPanel>[0]> = {}) {
  return {
    job: starterJob,
    settings: createInitialSettings(starterJob),
    onSettingChange: vi.fn(),
    onAniloxPresetChange: vi.fn(),
    onRegistrationChange: vi.fn(),
    onInkChannelChange: vi.fn(),
    ...overrides,
  };
}
```

Replace the entire `describe("ControlPanel — registration dpad")` block (5 tests) with the updated version below, which scopes color button clicks to the Registration color group via `within`:

```ts
describe("ControlPanel — registration dpad", () => {
  it("renders color selector buttons and no registration sliders", () => {
    render(<ControlPanel {...makeProps()} />);
    const regGroup = screen.getByRole("group", { name: "Registration color" });
    expect(within(regGroup).getByRole("button", { name: /cyan/i })).toBeInTheDocument();
    expect(within(regGroup).getByRole("button", { name: /magenta/i })).toBeInTheDocument();
    expect(within(regGroup).getByRole("button", { name: /yellow/i })).toBeInTheDocument();
    expect(within(regGroup).getByRole("button", { name: /black/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("cyanX")).not.toBeInTheDocument();
  });

  it("nudges selected color X by +0.1 when right arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const regGroup = screen.getByRole("group", { name: "Registration color" });
    fireEvent.click(within(regGroup).getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanX",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanX + 0.1, 5),
    );
  });

  it("nudges selected color Y by -0.1 when up arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const regGroup = screen.getByRole("group", { name: "Registration color" });
    fireEvent.click(within(regGroup).getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /up/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanY",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanY - 0.1, 5),
    );
  });

  it("routes nudge to the correct key when a non-default color is selected", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const regGroup = screen.getByRole("group", { name: "Registration color" });
    fireEvent.click(within(regGroup).getByRole("button", { name: /magenta/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "magentaX",
      expect.closeTo(createInitialSettings(starterJob).registration.magentaX + 0.1, 5),
    );
  });

  it("clamps registration nudge at ±4 mil", () => {
    const onRegistrationChange = vi.fn();
    render(
      <ControlPanel
        {...makeProps({
          settings: {
            ...createInitialSettings(starterJob),
            registration: { ...createInitialSettings(starterJob).registration, cyanX: 4 },
          },
          onRegistrationChange,
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith("cyanX", 4);
  });
});
```

- [ ] **Step 5: Run tests — expect 43 passing (40 + 3 new)**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `43 passed`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: per-color ink sliders in ControlPanel"
```

---

### Task 6: App wiring

**Files:**
- Modify: `src/App.tsx`

Add `handleInkChannelChange` and wire it to `ControlPanel`. No new tests — the handler is a one-liner that delegates to `updateInkChannelSetting`, which is already tested.

- [ ] **Step 1: Update `src/App.tsx`**

Update the import from `./domain/settings`:

```ts
import { createInitialSettings, updateInkChannelSetting, updateSetting } from "./domain/settings";
```

Update the type import from `./domain/types`:

```ts
import type { InkChannelKey, InkChannelSettingKey, PressSettingKey, RegistrationKey, ScoreSummary } from "./domain/types";
```

Add `handleInkChannelChange` after `handleRegistrationChange`:

```ts
function handleInkChannelChange(channel: InkChannelKey, key: InkChannelSettingKey, value: number) {
  setSettings((current) => updateInkChannelSetting(starterJob, current, channel, key, value));
}
```

Add `onInkChannelChange={handleInkChannelChange}` to `<ControlPanel>`:

```tsx
<ControlPanel
  job={starterJob}
  settings={settings}
  onSettingChange={handleSettingChange}
  onAniloxPresetChange={handleAniloxPresetChange}
  onRegistrationChange={handleRegistrationChange}
  onInkChannelChange={handleInkChannelChange}
/>
```

- [ ] **Step 2: Run all tests — expect 43 passing**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/npm \
run test -- --run 2>&1 | tail -6
```

Expected: `43 passed`.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic && \
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git -C /Users/robertcongdon/Documents/Codex/2026-05-12/i-want-to-build-a-flexographic \
  commit -am "feat: wire per-color ink controls to App"
```
