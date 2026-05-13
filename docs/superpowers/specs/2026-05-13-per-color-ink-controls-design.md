# Per-Color Ink Controls Design

**Goal:** Replace the three global ink sliders (viscosity, strength, impression) with per-CMYK-channel controls, and make the simulation engine compute density and gain independently per channel so mismatched ink settings produce visibly different plate densities on the canvas.

**Architecture:** Add `InkChannelSettings` to each channel in `PressSettings.inkChannels`. Engine runs the density/gain formula once per channel; defects and drying risk stay global (averaged). `SimulationOutcome` gains `channelDensity` and `channelGain` maps; existing `density` and `gain` become their means. `drawPlate` in `PrintPreview` already accepts density and gain as parameters — it just receives per-channel values instead of globals. `ControlPanel` gains a new "Ink" section (color selector + 3 sliders) that replaces the 3 removed global sliders.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library

---

## Types & Data Model

### `src/domain/types.ts`

Add:
```ts
export type InkChannelKey = "C" | "M" | "Y" | "K";

export type InkChannelSettings = {
  viscosity: number;
  strength: number;
  impression: number;
};

export type InkChannelSettingKey = keyof InkChannelSettings;
```

Remove from `PressSettingKey`: `"inkViscosity"`, `"inkStrength"`, `"impression"`.

`PressSettingKey` becomes:
```ts
export type PressSettingKey =
  | "aniloxVolume"
  | "aniloxLineScreen"
  | "webTension"
  | "dryerTemperature"
  | "pressSpeed";
```

Update `PressSettings`:
```ts
export type PressSettings = Record<PressSettingKey, number> & {
  substrate: SubstrateId;
  registration: Registration;
  inkChannels: Record<InkChannelKey, InkChannelSettings>;
};
```

Update `SimulationOutcome` — add per-channel maps alongside existing scalars:
```ts
export type SimulationOutcome = {
  density: number;          // mean of channelDensity
  gain: number;             // mean of channelGain
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

Update `JobPreset` — add ink channel ranges (shared across all 4 channels):
```ts
export type JobPreset = {
  // ...existing fields...
  inkChannelRanges: {
    viscosity: SettingRange;
    strength: SettingRange;
    impression: SettingRange;
  };
};
```

`JobTarget` keeps `inkViscosity` and `impression` as single values applied to all channels.

### `src/domain/jobs.ts`

Remove `inkViscosity`, `inkStrength`, `impression` from `starterJob.ranges`.

Add `inkChannelRanges` to `starterJob`:
```ts
inkChannelRanges: {
  viscosity:  { min: 18,  max: 45,  step: 1, unit: "s",  label: "Viscosity"  },
  strength:   { min: 70,  max: 120, step: 1, unit: "%",  label: "Strength"   },
  impression: { min: 0,   max: 100, step: 1, unit: "%",  label: "Impression" },
},
```

Update `starterJob.initialSettings` — remove the 3 global keys; add `inkChannels`:
```ts
inkChannels: {
  C: { viscosity: 31, strength: 104, impression: 67 },
  M: { viscosity: 31, strength: 104, impression: 67 },
  Y: { viscosity: 31, strength: 104, impression: 67 },
  K: { viscosity: 31, strength: 104, impression: 67 },
},
```

### `src/domain/settings.ts`

`updateSetting` still works unchanged for the 5 remaining `PressSettingKey` values.

Add:
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

---

## Simulation Engine (`src/simulation/engine.ts`)

Replace single-channel density/gain computation with a per-channel loop over `["C", "M", "Y", "K"]`.

For each channel `ch`:
```
const ch = settings.inkChannels[ch]
const impressionHigh_ch = clamp01((ch.impression - job.target.impression) / 42)
const impressionLow_ch  = clamp01((job.target.impression - ch.impression) / 38)
const viscosityLoad_ch  = ch.viscosity / job.target.inkViscosity
const inkStrengthLoad_ch = ch.strength / 100

channelDensity[ch] = max(0.35, 1 * aniloxLoad * inkStrengthLoad_ch * (1 - impressionLow_ch * 0.42) + impressionHigh_ch * 0.08)
channelGain[ch]    = max(0.05, job.target.gain + impressionHigh_ch * 0.34 + viscosityLoad_ch * 0.03)
```

`density` = mean of `channelDensity` values.
`gain` = mean of `channelGain` values.

Defects and drying risk use the mean impression and mean viscosity across all 4 channels (same formulas as today, just averaged inputs). Coaching uses the same mean-based thresholds.

---

## Canvas (`src/components/PrintPreview.tsx`)

`drawPlate` signature is unchanged: it already takes `gain` and `density` as parameters.

The call site changes from:
```ts
drawPlate(ctx, ch, pouchX, regX, regY, outcome.gain, outcome.density)
```
to:
```ts
drawPlate(ctx, ch, pouchX, regX, regY, outcome.channelGain[ch], outcome.channelDensity[ch])
```

No other change to `PrintPreview.tsx`.

---

## Control Panel (`src/components/ControlPanel.tsx`)

**Global sliders** section shrinks to 3 keys: `["webTension", "dryerTemperature", "pressSpeed"]`.

**New "Ink" section** (between Press settings and Registration):
- Same `ColorName` / `colorSwatches` as registration, but with a separate `selectedInkColor` state
- 3 sliders below the color buttons: Viscosity, Strength, Impression — reading from `settings.inkChannels[inkChannelKeys[selectedInkColor]]` and firing `onInkChannelChange(inkChannelKeys[selectedInkColor], key, value)`

New prop:
```ts
onInkChannelChange: (channel: InkChannelKey, key: InkChannelSettingKey, value: number) => void;
```

The `InkChannelKey` map:
```ts
const inkChannelKeys: Record<ColorName, InkChannelKey> = {
  cyan: "C", magenta: "M", yellow: "Y", black: "K",
};
```

---

## App Wiring (`src/App.tsx`)

Add handler:
```ts
function handleInkChannelChange(channel: InkChannelKey, key: InkChannelSettingKey, value: number) {
  setSettings((s) => updateInkChannelSetting(job, s, channel, key, value));
}
```

Pass `onInkChannelChange={handleInkChannelChange}` to `<ControlPanel>`.

---

## Tests

### `src/simulation/engine.test.ts`
- Channels with different viscosity/strength/impression values produce different `channelDensity` and `channelGain` entries
- When all 4 channels are identical, `density === mean(channelDensity)` and `gain === mean(channelGain)`
- A channel with high impression produces higher `channelGain` for that channel than a channel at target

### `src/components/ControlPanel.test.tsx`
- Ink color selector switches active channel (selectedInkColor state)
- Slider change fires `onInkChannelChange` with the correct `InkChannelKey` and `InkChannelSettingKey`
- Ink color selector is independent from registration color selector (changing one does not affect the other)

### Existing tests
All existing tests remain green. `MetricsStrip`, `PrintPreview`, and scoring tests do not reference `channelDensity` or `channelGain` directly, so no changes needed there.
