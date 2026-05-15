# Press Type & Ink Type Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent press-type (CI wide-web vs. inline narrow-web) and ink-type (water-based, solvent, UV) selectors, with a new inline press SVG diagram and a dryer→UV power control swap.

**Architecture:** Press type and ink type are top-level `App.tsx` state, independent of job. `PressOverview.tsx` is renamed `CIOverview.tsx`. A new `InlineOverview.tsx` component renders the inline SVG. `PressModel.tsx` routes between the two. `MetricsStrip` swaps the dryer range/label when UV ink is selected. The simulation engine is unchanged.

**Tech Stack:** React 19, TypeScript, SVG (hand-coded), Vitest + Testing Library

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/domain/types.ts` | Add `PressType`, `InkType` union types; extend `JobPreset` |
| Modify | `src/domain/jobs.ts` | Add `UV_POWER_RANGE`; add defaults to both jobs |
| Rename | `src/components/press/PressOverview.tsx` → `CIOverview.tsx` | No logic changes |
| Rename | `src/components/press/PressOverview.test.tsx` → `CIOverview.test.tsx` | Update import |
| Modify | `src/components/press/pressEducation.ts` | Add 4 inline-press education entries |
| Modify | `src/components/MetricsStrip.tsx` | Add `inkType` prop; swap dryer range when UV |
| Create | `src/components/MetricsStrip.test.tsx` | Tests for UV/non-UV range swap |
| Modify | `src/App.tsx` | Add `pressType`/`inkType` state + header dropdowns |
| Modify | `src/components/PressModel.tsx` | Add `pressType`/`inkType` props; route to CIOverview or InlineOverview |
| Create | `src/components/press/InlineOverview.tsx` | New inline press SVG component |
| Create | `src/components/press/InlineOverview.test.tsx` | Tests for inline press component |

**Run tests:** `/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run`
**Type check:** `/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit`

---

## Task 1: Add PressType, InkType, and UV_POWER_RANGE

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/jobs.ts`

- [ ] **Step 1: Add union types and extend JobPreset in types.ts**

Open `src/domain/types.ts`. After the `SubstrateId` line at the top, add:

```typescript
export type PressType = "ci" | "inline";
export type InkType   = "uv" | "water-based" | "solvent";
```

Find the `JobPreset` type (it has fields like `id`, `name`, `channels`). Add these two optional fields:

```typescript
  defaultPressType?: PressType;
  defaultInkType?:  InkType;
```

- [ ] **Step 2: Add UV_POWER_RANGE and job defaults in jobs.ts**

Open `src/domain/jobs.ts`. Add the import at the top:

```typescript
import type { AniloxPreset, ChannelDef, JobPreset, SettingRange } from "./types";
```

After the `aniloxPresets` constant, add:

```typescript
export const UV_POWER_RANGE: SettingRange = {
  min: 50, max: 500, step: 10, unit: "W/cm²", label: "UV power",
};
```

Find `snackPouchJob` (the exported `JobPreset` object for the snack pouch). Add inside its object literal:

```typescript
  defaultPressType: "ci",
  defaultInkType: "water-based",
```

Find `labelPrintJob` (the exported `JobPreset` for label printing). Add:

```typescript
  defaultPressType: "inline",
  defaultInkType: "water-based",
```

- [ ] **Step 3: Run type check**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/jobs.ts
git commit -m "feat: add PressType, InkType union types and UV_POWER_RANGE"
```

---

## Task 2: Rename PressOverview → CIOverview

**Files:**
- Create: `src/components/press/CIOverview.tsx` (from PressOverview.tsx)
- Create: `src/components/press/CIOverview.test.tsx` (from PressOverview.test.tsx)
- Modify: `src/components/PressModel.tsx` (update import)
- Delete: `src/components/press/PressOverview.tsx`
- Delete: `src/components/press/PressOverview.test.tsx`

- [ ] **Step 1: Copy PressOverview.tsx to CIOverview.tsx**

Create `src/components/press/CIOverview.tsx` as a copy of `PressOverview.tsx` with two changes:
1. The exported function name changes from `PressOverview` to `CIOverview`
2. The `data-testid` on the root SVG element stays `"press-overview"` (keeps existing PressModel and App tests passing)

The `Props` type and all logic are unchanged. The file should look exactly like the current `PressOverview.tsx` except:

```typescript
// export function PressOverview(  ←  was
export function CIOverview(
```

- [ ] **Step 2: Update PressModel.tsx import**

Open `src/components/PressModel.tsx`. Change:

```typescript
import { PressOverview } from "./press/PressOverview";
```

to:

```typescript
import { CIOverview } from "./press/CIOverview";
```

Also update the JSX usage from `<PressOverview` to `<CIOverview` (and closing `/>` or `</PressOverview>` to `</CIOverview>`).

- [ ] **Step 3: Create CIOverview.test.tsx**

Create `src/components/press/CIOverview.test.tsx` as a copy of `PressOverview.test.tsx` with these changes:
- File-level comment: `// src/components/press/CIOverview.test.tsx`
- Import: `import { CIOverview } from "./CIOverview";`
- `describe("CIOverview", ...)` (rename the describe block)
- All render calls: `<CIOverview` instead of `<PressOverview`

Full file:

```typescript
// src/components/press/CIOverview.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { CIOverview } from "./CIOverview";

function makeProps(overrides = {}) {
  const settings = createInitialSettings(snackPouchJob);
  return {
    job: snackPouchJob,
    settings,
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40,
      setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "operate" as const,
    selectedChannelId: "C",
    onStationClick: vi.fn(),
    ...overrides,
  };
}

describe("CIOverview", () => {
  it("renders an SVG element", () => {
    const { container } = render(<CIOverview {...makeProps()} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    render(<CIOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with the correct channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    render(<CIOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M", expect.any(Number));
  });

  it("highlights the selected station", () => {
    render(<CIOverview {...makeProps({ selectedChannelId: "K" })} />);
    const station = screen.getByTestId("station-K");
    expect(station).toHaveAttribute("data-selected", "true");
  });

  it("shows component labels in learn mode", () => {
    render(<CIOverview {...makeProps({ mode: "learn" })} />);
    expect(screen.getByText("Central Impression Drum")).toBeInTheDocument();
    expect(screen.getAllByText("Anilox Roll").length).toBeGreaterThan(0);
  });

  it("does not show component labels in operate mode", () => {
    render(<CIOverview {...makeProps({ mode: "operate" })} />);
    expect(screen.queryByText("Central Impression Drum")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Delete the old files**

```bash
rm src/components/press/PressOverview.tsx
rm src/components/press/PressOverview.test.tsx
```

- [ ] **Step 5: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run
```

Expected: all existing tests pass (PressModel.test.tsx and App.test.tsx use `data-testid="press-overview"` which is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/components/press/CIOverview.tsx src/components/press/CIOverview.test.tsx \
        src/components/PressModel.tsx
git rm src/components/press/PressOverview.tsx src/components/press/PressOverview.test.tsx
git commit -m "refactor: rename PressOverview to CIOverview"
```

---

## Task 3: Add Inline Press Education Entries

**Files:**
- Modify: `src/components/press/pressEducation.ts`

- [ ] **Step 1: Add four entries to PRESS_EDUCATION**

Open `src/components/press/pressEducation.ts`. Inside the `PRESS_EDUCATION` object, add after the existing `web` entry:

```typescript
  inlinePress: {
    name: "Inline Narrow-Web Press",
    description:
      "Stations are arranged in a horizontal line and each has its own impression cylinder. The web threads through each station sequentially rather than wrapping around a shared central drum. Registration errors can accumulate from station to station, making precise mechanical setup more critical than on a CI press.",
  },
  impressionCylinder: {
    name: "Impression Cylinder",
    description:
      "On an inline press each station has its own impression cylinder that backs the substrate at the print nip. Impression pressure is set independently per station, giving more flexibility but requiring individual calibration.",
  },
  fountainRoll: {
    name: "Fountain Roll",
    description:
      "A rubber-covered roller that rotates partially submerged in the ink pan. It picks up a film of ink and transfers it to the anilox roll. Fountain roll speed relative to the anilox affects how much ink is supplied to the system.",
  },
  interStationDryer: {
    name: "Inter-station Dryer / UV Lamp",
    description:
      "On an inline press the web passes through a drying or curing unit between each print station. This allows ink to set before the next colour is applied, reducing trapping issues and enabling reverse printing on clear film. UV lamps cure ink instantly with no heat; hot-air dryers evaporate solvent or water.",
  },
```

- [ ] **Step 2: Run type check**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/press/pressEducation.ts
git commit -m "feat: add inline press education entries"
```

---

## Task 4: MetricsStrip Dryer → UV Power Swap

**Files:**
- Modify: `src/components/MetricsStrip.tsx`
- Create: `src/components/MetricsStrip.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/MetricsStrip.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { MetricsStrip } from "./MetricsStrip";

function makeProps(overrides = {}) {
  const settings = createInitialSettings(snackPouchJob);
  return {
    job: snackPouchJob,
    settings,
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40,
      setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "guided" as const,
    onSettingChange: vi.fn(),
    ...overrides,
  };
}

describe("MetricsStrip", () => {
  it("shows dryer temperature label when ink type is water-based (default)", () => {
    render(<MetricsStrip {...makeProps()} />);
    expect(screen.getByText("Dryer temperature")).toBeInTheDocument();
  });

  it("shows UV power label when ink type is uv", () => {
    render(<MetricsStrip {...makeProps({ inkType: "uv" })} />);
    expect(screen.getByText("UV power")).toBeInTheDocument();
    expect(screen.queryByText("Dryer temperature")).not.toBeInTheDocument();
  });

  it("shows dryer temperature label when ink type is solvent", () => {
    render(<MetricsStrip {...makeProps({ inkType: "solvent" })} />);
    expect(screen.getByText("Dryer temperature")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run src/components/MetricsStrip.test.tsx
```

Expected: FAIL — `inkType` prop is not accepted yet.

- [ ] **Step 3: Update MetricsStrip.tsx**

Open `src/components/MetricsStrip.tsx`.

Add to the imports at the top:

```typescript
import { UV_POWER_RANGE } from "../domain/jobs";
import type { InkType } from "../domain/types";
```

Update the `MetricsStripProps` type to add the new prop with a default:

```typescript
type MetricsStripProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: TrainingMode;
  inkType?: InkType;
  onSettingChange: (key: PressSettingKey, value: number) => void;
};
```

Update the destructure in the component signature:

```typescript
export function MetricsStrip({ job, settings, outcome, mode, inkType = "water-based", onSettingChange }: MetricsStripProps) {
```

Inside the component, before the return, add:

```typescript
  const dryerRange = inkType === "uv" ? UV_POWER_RANGE : job.ranges.dryerTemperature;
```

In the `PRESS_SETTING_KEYS.map` block, replace:

```typescript
  const range = job.ranges[key];
```

with:

```typescript
  const range = key === "dryerTemperature" ? dryerRange : job.ranges[key];
```

- [ ] **Step 4: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/MetricsStrip.tsx src/components/MetricsStrip.test.tsx
git commit -m "feat: swap dryer label/range to UV power when inkType is uv"
```

---

## Task 5: App.tsx Press Type and Ink Type Selectors

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add state and handlers**

Open `src/App.tsx`.

Add to the imports:

```typescript
import type {
  ChannelId,
  CustomPdfJob,
  InkChannelSettingKey,
  InkType,
  JobPreset,
  PressSettingKey,
  PressType,
  RegistrationOffset,
} from "./domain/types";
import { UV_POWER_RANGE } from "./domain/jobs";
```

After the existing state declarations (below `const [showPdfUpload, setShowPdfUpload] = useState(false);`), add:

```typescript
  const [pressType, setPressType] = useState<PressType>(
    snackPouchJob.defaultPressType ?? "ci"
  );
  const [inkType, setInkType] = useState<InkType>(
    snackPouchJob.defaultInkType ?? "water-based"
  );
```

Update the `switchJob` function to also reset press type and ink type:

```typescript
  function switchJob(job: JobPreset) {
    setSelectedJob(job);
    setCustomJob(null);
    setSettings(createInitialSettings(job));
    setScore(null);
    setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
    setPressType(job.defaultPressType ?? "ci");
    setInkType(job.defaultInkType ?? "water-based");
  }
```

Add handler functions after `makePerfect`:

```typescript
  function handlePressTypeChange(next: PressType) {
    setPressType(next);
    if (next === "ci" && inkType === "uv") {
      setInkType("water-based");
      setSettings(current => ({
        ...current,
        dryerTemperature: activeJob.initialSettings.dryerTemperature,
      }));
    }
  }

  function handleInkTypeChange(next: InkType) {
    setInkType(next);
    if (next === "uv") {
      setSettings(current => ({ ...current, dryerTemperature: UV_POWER_RANGE.min }));
    } else if (inkType === "uv") {
      setSettings(current => ({
        ...current,
        dryerTemperature: activeJob.initialSettings.dryerTemperature,
      }));
    }
  }
```

- [ ] **Step 2: Update the header JSX**

Replace the header `<div>` block that currently reads:

```tsx
      <header className="app-header">
        <div>
          <p className="eyebrow">Wide-web flexible packaging</p>
          <h1>Flexographic Press Simulator</h1>
        </div>
        <div className="header-actions">
```

with:

```tsx
      <header className="app-header">
        <div>
          <p className="eyebrow">
            {pressType === "ci" ? "CI wide-web" : "Inline narrow-web"}
            {" · "}
            {inkType === "uv" ? "UV" : inkType === "solvent" ? "Solvent" : "Water-based"}
          </p>
          <h1>Flexographic Press Simulator</h1>
        </div>
        <div className="header-actions">
          <select
            className="job-selector"
            value={pressType}
            aria-label="Select press type"
            onChange={e => handlePressTypeChange(e.target.value as PressType)}
          >
            <option value="ci">CI Wide Web</option>
            <option value="inline">Inline Narrow Web</option>
          </select>
          <select
            className="job-selector"
            value={inkType}
            aria-label="Select ink type"
            onChange={e => handleInkTypeChange(e.target.value as InkType)}
          >
            <option value="water-based">Water-based</option>
            <option value="solvent">Solvent</option>
            <option value="uv" disabled={pressType === "ci"}>UV</option>
          </select>
```

- [ ] **Step 3: Pass new props to PressModel and MetricsStrip**

Find the `<PressModel` JSX and add two props:

```tsx
            <PressModel
              job={activeJob}
              settings={settings}
              outcome={outcome}
              selectedChannelId={selectedChannelId}
              onStationSelect={setSelectedChannelId}
              pressType={pressType}
              inkType={inkType}
            />
```

Find the `<MetricsStrip` JSX and add one prop:

```tsx
      <MetricsStrip
        job={activeJob}
        settings={settings}
        outcome={outcome}
        mode={mode}
        inkType={inkType}
        onSettingChange={handleSettingChange}
      />
```

- [ ] **Step 4: Run type check and tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run
```

Expected: no type errors, all tests pass (PressModel.tsx will have TypeScript errors until Task 6; fix those first if needed).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add press type and ink type selectors to App header"
```

---

## Task 6: PressModel Routing and InlineOverview Stub

**Files:**
- Modify: `src/components/PressModel.tsx`
- Create: `src/components/press/InlineOverview.tsx`
- Modify: `src/components/PressModel.test.tsx` (if it breaks)

- [ ] **Step 1: Create InlineOverview stub**

Create `src/components/press/InlineOverview.tsx`:

```typescript
import type { ChannelId, InkType, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  inkType: InkType;
  onStationClick: (id: ChannelId) => void;
};

export function InlineOverview({ job, settings, outcome, mode, selectedChannelId, inkType, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);

  return (
    <svg
      data-testid="press-overview"
      viewBox="0 0 900 400"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="900" height="400" fill="#1a1a2e" rx="8" />
      {activeChannels.map((ch, i) => (
        <g
          key={ch.id}
          data-testid={`station-${ch.id}`}
          data-selected={ch.id === selectedChannelId ? "true" : undefined}
          onClick={() => onStationClick(ch.id)}
          style={{ cursor: "pointer" }}
        >
          <rect x={60 + i * 80} y={160} width={60} height={60} rx="4" fill="#2a2a4a" />
          <text x={90 + i * 80} y={195} textAnchor="middle" fill="white" fontSize="10">
            {ch.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
```

This stub satisfies the `data-testid="press-overview"` and per-station `data-testid="station-{id}"` contract so App.test.tsx and PressModel.test.tsx keep passing. Task 7 replaces the internals with the full SVG.

- [ ] **Step 2: Update PressModel.tsx**

Open `src/components/PressModel.tsx`.

Add imports:

```typescript
import type { InkType, PressType } from "../domain/types";
import { CIOverview } from "./press/CIOverview";
import { InlineOverview } from "./press/InlineOverview";
```

Remove the old `PressOverview` import.

Add the new props to `PressModelProps`:

```typescript
type PressModelProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  selectedChannelId: ChannelId;
  pressType?: PressType;
  inkType?: InkType;
  onStationSelect?: (id: ChannelId) => void;
};
```

Update the component signature:

```typescript
export function PressModel({ job, settings, outcome, selectedChannelId, pressType = "ci", inkType = "water-based", onStationSelect }: PressModelProps) {
```

Replace the overview rendering block. Find:

```tsx
      {view.type === "overview" ? (
        <PressOverview
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          selectedChannelId={selectedChannelId}
          onStationClick={(id) => {
            const slot = activeChannels.findIndex(ch => ch.id === id);
            if (slot >= 0) goToSlot(slot);
          }}
        />
```

Replace with:

```tsx
      {view.type === "overview" ? (
        pressType === "ci" ? (
          <CIOverview
            job={job}
            settings={settings}
            outcome={outcome}
            mode={mode}
            selectedChannelId={selectedChannelId}
            onStationClick={(id) => {
              const slot = activeChannels.findIndex(ch => ch.id === id);
              if (slot >= 0) goToSlot(slot);
            }}
          />
        ) : (
          <InlineOverview
            job={job}
            settings={settings}
            outcome={outcome}
            mode={mode}
            selectedChannelId={selectedChannelId}
            inkType={inkType}
            onStationClick={(id) => {
              const slot = activeChannels.findIndex(ch => ch.id === id);
              if (slot >= 0) goToSlot(slot);
            }}
          />
        )
```

Also update the `StationDetail` call to pass `stationAngle={pressType === "ci" ? (STATION_ANGLES[view.slotIndex] ?? 0) : 0}`:

```tsx
          stationAngle={pressType === "ci" ? (STATION_ANGLES[view.slotIndex] ?? 0) : 0}
```

- [ ] **Step 3: Run type check and tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/PressModel.tsx src/components/press/InlineOverview.tsx
git commit -m "feat: route PressModel to CIOverview or InlineOverview based on pressType"
```

---

## Task 7: Full InlineOverview SVG

**Files:**
- Modify: `src/components/press/InlineOverview.tsx`
- Create: `src/components/press/InlineOverview.test.tsx`

### Geometry constants

```
SVG_W = 980, SVG_H = 400
WEB_Y = 140            (web travels horizontally at this y)
STATION_PITCH = 90     (px between station centers)
FIRST_X = 70           (x center of first station)
MAX_SLOTS = 10

Per station:
  PLATE_R = 18         plate cylinder radius
  IMP_R = 18           impression cylinder radius
  NIP_HALF = 20        half-gap so nip is at station cx
  Plate center:   (cx - NIP_HALF, WEB_Y)
  Impression:     (cx + NIP_HALF, WEB_Y)
  (plate right edge = cx - NIP_HALF + PLATE_R = cx-2; impression left = cx+2; 4px gap = web)

  ANILOX_R = 14
  Anilox center:  (cx - NIP_HALF, WEB_Y + PLATE_R + ANILOX_R)  = (cx-20, WEB_Y+32)

  FOUNTAIN_R = 12
  Fountain center: (cx - NIP_HALF, WEB_Y + 32 + ANILOX_R + FOUNTAIN_R) = (cx-20, WEB_Y+58)

  Ink pan: trapezoid top at WEB_Y+70, bottom at WEB_Y+100
           width at top = 48, width at bottom = 36, centered on cx-20

V-dip between stations:
  From nip at (cx, WEB_Y) to mid-point (cx + PITCH/2, WEB_Y + 55) to next nip at (cx+PITCH, WEB_Y)
  Dryer icon at mid-point

Reels:
  Unwind: circle cx=30, cy=WEB_Y, r=22
  Rewind: circle cx=FIRST_X + nStations*PITCH, cy=WEB_Y, r=22
  Web enters from left at (unwind right edge, WEB_Y), exits at rewind left edge
```

- [ ] **Step 1: Write failing tests**

Create `src/components/press/InlineOverview.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { InlineOverview } from "./InlineOverview";

function makeProps(overrides = {}) {
  const settings = createInitialSettings(snackPouchJob);
  return {
    job: snackPouchJob,
    settings,
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40,
      setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "operate" as const,
    selectedChannelId: "C",
    inkType: "water-based" as const,
    onStationClick: vi.fn(),
    ...overrides,
  };
}

describe("InlineOverview", () => {
  it("renders an SVG element with data-testid=press-overview", () => {
    render(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    render(<InlineOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    render(<InlineOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M");
  });

  it("marks the selected station", () => {
    render(<InlineOverview {...makeProps({ selectedChannelId: "K" })} />);
    expect(screen.getByTestId("station-K")).toHaveAttribute("data-selected", "true");
  });

  it("shows inter-station dryer labels in learn mode with water-based ink", () => {
    render(<InlineOverview {...makeProps({ mode: "learn" })} />);
    expect(screen.getAllByText("Dryer").length).toBeGreaterThan(0);
  });

  it("shows UV labels in learn mode with UV ink", () => {
    render(<InlineOverview {...makeProps({ mode: "learn", inkType: "uv" })} />);
    expect(screen.getAllByText("UV").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dryer")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run src/components/press/InlineOverview.test.tsx
```

Expected: learn-mode label tests fail (stub has no labels), UV test fails.

- [ ] **Step 3: Implement full InlineOverview SVG**

Replace the entire contents of `src/components/press/InlineOverview.tsx` with:

```typescript
import { PRESS_EDUCATION } from "./pressEducation";
import type { ChannelId, InkType, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  inkType: InkType;
  onStationClick: (id: ChannelId) => void;
};

const SVG_W       = 980;
const SVG_H       = 400;
const WEB_Y       = 130;
const PITCH       = 90;
const FIRST_X     = 70;
const MAX_SLOTS   = 10;

const PLATE_R     = 18;
const IMP_R       = 18;
const NIP_HALF    = 20;  // distance from station cx to each cylinder center
const ANILOX_R    = 14;
const FOUNTAIN_R  = 12;

const DIP_Y       = WEB_Y + 60; // y of dryer icon bottom

const COL_W       = 40;  // ink pan top width
const REEL_R      = 22;

function healthColor(severity: number): string {
  if (severity < 20) return "#22a559";
  if (severity < 50) return "#e08c00";
  return "#d63b3b";
}

function StationColumn({
  cx, ch, outcome, selected, mode, onClick,
}: {
  cx: number;
  ch: { id: string; name: string; displayColor: string } | null;
  outcome: SimulationOutcome;
  selected: boolean;
  mode: PressMode;
  onClick: () => void;
}) {
  const isActive = ch !== null;
  const color = isActive ? ch!.displayColor : "#444";
  const ringColor = isActive
    ? healthColor(
        Math.max(
          outcome.defects.pinholes,
          outcome.defects.dirtyPrint,
          outcome.defects.edgeSquash,
        )
      )
    : "#555";

  const plateCx  = cx - NIP_HALF;
  const impCx    = cx + NIP_HALF;
  const aniloxCy = WEB_Y + PLATE_R + ANILOX_R;
  const fontCy   = WEB_Y + PLATE_R + ANILOX_R * 2 + FOUNTAIN_R;

  // Ink pan trapezoid points
  const panTop    = fontCy + FOUNTAIN_R + 6;
  const panBot    = panTop + 28;
  const panHalfT  = COL_W / 2;
  const panHalfB  = panHalfT - 8;
  const panPts    = [
    `${plateCx - panHalfT},${panTop}`,
    `${plateCx + panHalfT},${panTop}`,
    `${plateCx + panHalfB},${panBot}`,
    `${plateCx - panHalfB},${panBot}`,
  ].join(" ");

  const selectRing = selected
    ? <circle cx={cx} cy={WEB_Y} r={IMP_R + NIP_HALF + 6} fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
    : null;

  return (
    <g
      data-testid={isActive ? `station-${ch!.id}` : undefined}
      data-selected={selected ? "true" : undefined}
      onClick={isActive ? onClick : undefined}
      style={{ cursor: isActive ? "pointer" : "default" }}
    >
      {selectRing}

      {/* Health ring around impression */}
      <circle cx={impCx} cy={WEB_Y} r={IMP_R + 4} fill="none" stroke={ringColor} strokeWidth="3" opacity={isActive ? 0.9 : 0.3} />

      {/* Impression cylinder */}
      <circle cx={impCx} cy={WEB_Y} r={IMP_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />

      {/* Plate cylinder */}
      <circle cx={plateCx} cy={WEB_Y} r={PLATE_R} fill={isActive ? "#3a3a5a" : "#2a2a3a"} stroke={color} strokeWidth="1.5" />

      {/* Anilox roll */}
      <circle cx={plateCx} cy={aniloxCy} r={ANILOX_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#666" strokeWidth="1" />

      {/* Fountain roll (partially in ink pan) */}
      <circle cx={plateCx} cy={fontCy} r={FOUNTAIN_R} fill={isActive ? "#2e2e4e" : "#222233"} stroke="#555" strokeWidth="1" />

      {/* Ink pan */}
      <polygon points={panPts} fill={isActive ? "#1e1e3e" : "#181828"} stroke="#555" strokeWidth="1" />

      {/* Channel label */}
      {isActive && (
        <text x={impCx} y={WEB_Y + 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">
          {ch!.id.length === 1 ? ch!.id : ch!.id.slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* Learn-mode labels */}
      {mode === "learn" && isActive && (
        <>
          <text x={impCx + IMP_R + 4} y={WEB_Y - 2} fill="#ccc" fontSize="8">{PRESS_EDUCATION.impressionCylinder.name}</text>
          <text x={plateCx - PLATE_R - 4} y={WEB_Y - 2} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.plateCylinder.name}</text>
          <text x={plateCx - ANILOX_R - 4} y={aniloxCy + 3} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.aniloxRoll.name}</text>
          <text x={plateCx - FOUNTAIN_R - 4} y={fontCy + 3} fill="#ccc" fontSize="8" textAnchor="end">{PRESS_EDUCATION.fountainRoll.name}</text>
        </>
      )}
    </g>
  );
}

function DryerIcon({ x, y, inkType, mode }: { x: number; y: number; inkType: InkType; mode: PressMode }) {
  const isUv = inkType === "uv";
  const label = isUv ? "UV" : "Dryer";
  return (
    <g>
      {isUv ? (
        <>
          <rect x={x - 10} y={y - 8} width={20} height={16} rx="2" fill="#2a2a1e" stroke="#c8a000" strokeWidth="1.5" />
          {[-6, -2, 2, 6].map(dx => (
            <line key={dx} x1={x + dx} y1={y - 8} x2={x + dx} y2={y - 14} stroke="#c8a000" strokeWidth="1" />
          ))}
        </>
      ) : (
        <>
          <rect x={x - 12} y={y - 8} width={24} height={16} rx="3" fill="#2a1a1a" stroke="#d06030" strokeWidth="1.5" />
          {[-4, 0, 4].map(dx => (
            <path key={dx} d={`M${x + dx},${y - 8} Q${x + dx + 3},${y - 12} ${x + dx},${y - 16} Q${x + dx - 3},${y - 20} ${x + dx},${y - 24}`}
              fill="none" stroke="#d06030" strokeWidth="1" opacity="0.7" />
          ))}
        </>
      )}
      {mode === "learn" && (
        <text x={x} y={y + 16} textAnchor="middle" fill="#999" fontSize="8">{label}</text>
      )}
    </g>
  );
}

export function InlineOverview({ job, settings, outcome, mode, selectedChannelId, inkType, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
  const nStations = Math.min(activeChannels.length, MAX_SLOTS);

  const rewindX = FIRST_X + nStations * PITCH;

  // Build web path: from unwind, through each station nip, V-dips between, to rewind
  let webPath = `M ${REEL_R + 8},${WEB_Y}`;
  for (let i = 0; i < nStations; i++) {
    const cx = FIRST_X + i * PITCH;
    webPath += ` L ${cx},${WEB_Y}`;
    if (i < nStations - 1) {
      const midX = cx + PITCH / 2;
      webPath += ` Q ${cx + PITCH * 0.25},${DIP_Y} ${midX},${DIP_Y}`;
      webPath += ` Q ${cx + PITCH * 0.75},${DIP_Y} ${cx + PITCH},${WEB_Y}`;
    }
  }
  webPath += ` L ${rewindX + REEL_R - 8},${WEB_Y}`;

  return (
    <svg
      data-testid="press-overview"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#1a1a2e" rx="8" />

      {/* Web path */}
      <path d={webPath} fill="none" stroke="#ccc" strokeWidth="3" opacity="0.7" />

      {/* Unwind reel */}
      <circle cx={REEL_R} cy={WEB_Y} r={REEL_R} fill="#2a2a4a" stroke="#666" strokeWidth="1.5" />
      <circle cx={REEL_R} cy={WEB_Y} r={8} fill="#1a1a2e" />
      {mode === "learn" && (
        <text x={REEL_R} y={WEB_Y + REEL_R + 14} textAnchor="middle" fill="#999" fontSize="8">Unwind</text>
      )}

      {/* Station columns */}
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const cx = FIRST_X + i * PITCH;
        const ch = i < nStations ? activeChannels[i] : null;
        return (
          <StationColumn
            key={i}
            cx={cx}
            ch={ch}
            outcome={outcome}
            selected={ch?.id === selectedChannelId}
            mode={mode}
            onClick={() => ch && onStationClick(ch.id)}
          />
        );
      })}

      {/* Inter-station dryer/UV icons */}
      {Array.from({ length: nStations - 1 }, (_, i) => {
        const midX = FIRST_X + i * PITCH + PITCH / 2;
        return (
          <DryerIcon key={i} x={midX} y={DIP_Y} inkType={inkType} mode={mode} />
        );
      })}

      {/* Rewind reel */}
      <circle cx={rewindX} cy={WEB_Y} r={REEL_R} fill="#2a2a4a" stroke="#666" strokeWidth="1.5" />
      <circle cx={rewindX} cy={WEB_Y} r={8} fill="#1a1a2e" />
      {mode === "learn" && (
        <text x={rewindX} y={WEB_Y + REEL_R + 14} textAnchor="middle" fill="#999" fontSize="8">Rewind</text>
      )}

      {/* Inline press learn label */}
      {mode === "learn" && (
        <text x={SVG_W / 2} y={SVG_H - 10} textAnchor="middle" fill="#888" fontSize="9">
          {PRESS_EDUCATION.inlinePress.name}
        </text>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Run all tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/vitest run
```

Expected: all tests pass including the new InlineOverview tests.

- [ ] **Step 5: Run type check**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/press/InlineOverview.tsx src/components/press/InlineOverview.test.tsx
git commit -m "feat: implement InlineOverview SVG with station anatomy and inter-station dryer/UV icons"
```
