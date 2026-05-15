# Press Type & Ink Type Selection Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent press-type (CI wide-web vs. inline narrow-web) and ink-type (water-based, solvent, UV) selectors, with a new inline press SVG diagram and a dryer→UV power control swap.

**Architecture:** Press type and ink type are top-level `App.tsx` state, independent of the job preset. The press model routes to either `CIOverview` (renamed from `PressOverview`) or a new `InlineOverview` based on press type. The `dryerTemperature` setting key is reused for UV power — only the label, unit, and range swap at the component level when UV ink is selected. The simulation engine is unchanged.

**Tech Stack:** React 19, TypeScript, SVG (inline press diagram hand-coded)

---

## Types and data model (`src/domain/types.ts`, `src/domain/jobs.ts`)

Two new union types:

```typescript
export type PressType = "ci" | "inline";
export type InkType  = "uv" | "water-based" | "solvent";
```

`JobPreset` gains two optional hint fields:

```typescript
defaultPressType?: PressType;
defaultInkType?:  InkType;
```

- `snackPouchJob` → `defaultPressType: "ci"`, `defaultInkType: "water-based"`
- `labelPrintJob` → `defaultPressType: "inline"`, `defaultInkType: "water-based"`

A UV power range constant is added to `jobs.ts` (not job-specific):

```typescript
export const UV_POWER_RANGE: SettingRange = {
  min: 50, max: 500, step: 10, unit: "W/cm²", label: "UV power",
};
```

`PressSettings` is unchanged — press type and ink type live in `App.tsx` state only.

---

## App-level selectors (`src/App.tsx`)

Two new state variables:

```typescript
const [pressType, setPressType] = useState<PressType>(
  snackPouchJob.defaultPressType ?? "ci"
);
const [inkType, setInkType] = useState<InkType>(
  snackPouchJob.defaultInkType ?? "water-based"
);
```

**On job switch:** both reset to the incoming job's defaults (falling back to `"ci"` / `"water-based"`).

**On press type switch to `"ci"`:** if `inkType === "uv"`, auto-correct to `"water-based"`.

**On ink type switch to `"uv"`:** reset `dryerTemperature` in settings to `UV_POWER_RANGE.min` (50).

**On ink type switch away from `"uv"`:** reset `dryerTemperature` to `job.initialSettings.dryerTemperature`.

**Header layout** (left to right):

```
[ CI Wide Web ▾ ]  [ Water-based ▾ ]  [ Snack Pouch Film ▾ ]  Reset  Make perfect  Finish run
```

- Press type dropdown options: `"CI Wide Web"` / `"Inline Narrow Web"`
- Ink type dropdown options: `"Water-based"` / `"Solvent"` / `"UV"` — the UV option carries `disabled` when `pressType === "ci"` so students can see it exists but understand it isn't available on that press
- The eyebrow line updates dynamically, e.g. `"CI wide-web · Water-based"` or `"Inline narrow-web · UV"`

`pressType` and `inkType` are passed as props to `PressModel`, `ControlPanel`, and `MetricsStrip` only.

---

## CI press model (`src/components/press/CIOverview.tsx`)

Rename `PressOverview.tsx` → `CIOverview.tsx`. No logic changes. Update all imports.

---

## Inline press model (`src/components/press/InlineOverview.tsx`)

New component. Shares the same props interface as `CIOverview`:

```typescript
type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  inkType: InkType;
  onStationClick: (id: ChannelId) => void;
};
```

### SVG layout

The SVG viewBox is wide enough to fit 10 station columns plus unwind/rewind reels. The web path runs left to right at a fixed `WEB_Y` height. Between each station the web dips downward in a V-curve to pass through a dryer/UV unit icon at the bottom of the dip. After the last active station the web continues to the rewind reel.

### Station anatomy (per column, bottom to top)

Each station is a vertical column centred on the web path:

1. **Ink pan** — shallow trapezoid at the bottom of the column
2. **Fountain roll** — circle partially overlapping the ink pan, represents the rubber fountain roll picking up ink
3. **Anilox roll** — circle above/touching the fountain roll
4. **Plate cylinder** — circle above/touching the anilox roll
5. **Impression cylinder** — circle at the same height as the plate cylinder, offset horizontally so the web nip sits between them at `WEB_Y`

The web line passes through the plate/impression nip. Unused station slots render all elements in gray with no label.

Health ring, selection highlight, channel label, and learn-mode label behaviours are identical to `CIOverview`.

### Inter-station dryer/UV icon

Between each pair of adjacent station columns, a small icon sits below the web at the bottom of the V-dip:

- **Water-based / solvent:** rounded rectangle labelled "Dryer" with small heat-wave lines
- **UV:** narrow rectangle labelled "UV" with short radiating lines above it

Icon appearance is driven by the `inkType` prop.

### Learn-mode labels

Clickable learn labels appear on: the impression cylinder, fountain roll, anilox roll, plate cylinder, and inter-station dryer/UV unit. They reference the inline-specific education entries.

---

## Press model router (`src/components/PressModel.tsx`)

`PressModel` receives `pressType: PressType` and `inkType: InkType` as new props and routes:

```typescript
pressType === "ci"
  ? <CIOverview ... />
  : <InlineOverview ... inkType={inkType} />
```

`STATION_ANGLES` is already defined in `PressModel.tsx` and stays there. When `pressType === "ci"` the existing `STATION_ANGLES[view.slotIndex] ?? 0` lookup is used for `StationDetail`. When `pressType === "inline"` `stationAngle` is always passed as `0` — inline stations have no angular position.

---

## Press education content (`src/components/press/pressEducation.ts`)

Four new entries added alongside the existing CI entries:

```typescript
inlinePress: {
  name: "Inline Narrow-Web Press",
  description: "Stations are arranged in a horizontal line and each has its own impression cylinder. The web threads through each station sequentially rather than wrapping around a shared central drum. Registration errors can accumulate from station to station, making precise mechanical setup more critical than on a CI press.",
},
impressionCylinder: {
  name: "Impression Cylinder",
  description: "On an inline press each station has its own impression cylinder that backs the substrate at the print nip. Impression pressure is set independently per station, giving more flexibility but requiring individual calibration.",
},
fountainRoll: {
  name: "Fountain Roll",
  description: "A rubber-covered roller that rotates partially submerged in the ink pan. It picks up a film of ink and transfers it to the anilox roll. Fountain roll speed relative to the anilox affects how much ink is supplied to the system.",
},
interStationDryer: {
  name: "Inter-station Dryer / UV Lamp",
  description: "On an inline press the web passes through a drying or curing unit between each print station. This allows ink to set before the next colour is applied, reducing trapping issues and enabling reverse printing on clear film. UV lamps cure ink instantly with no heat; hot-air dryers evaporate solvent or water.",
},
```

---

## Dryer → UV power swap (`src/components/ControlPanel.tsx`, `src/components/MetricsStrip.tsx`)

Both components receive `inkType: InkType` as a new prop.

**Range selection logic (shared):**

```typescript
const dryerRange = inkType === "uv" ? UV_POWER_RANGE : job.ranges.dryerTemperature;
```

**ControlPanel:** the dryer slider uses `dryerRange.label`, `dryerRange.unit`, `dryerRange.min/max/step`.

**MetricsStrip:** the dryer row label and unit update from `dryerRange`.

The stored key in `PressSettings` remains `dryerTemperature` throughout — no type changes needed.

---

## Constraints

- CI press: ink type is `"water-based"` or `"solvent"` only. UV is visible but disabled in the dropdown.
- Inline press: all three ink types are available.
- Switching press type to CI while UV is active silently corrects to `"water-based"`.
- Switching to UV resets the dryer setting to `UV_POWER_RANGE.min`; switching away resets it to the job's `initialSettings.dryerTemperature`.
- The simulation engine (`engine.ts`) is not modified. It continues to use `dryerTemperature` normalised against whichever range is active — the maths are identical.
