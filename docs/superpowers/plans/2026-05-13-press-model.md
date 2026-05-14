# Press Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reactive, educational Wide-Web CI press model to the simulator as a tab alongside the existing Printed Output view, with SVG full-press overview and Canvas station detail sub-views.

**Architecture:** A new `PressModel` component is added as a tab in the print workspace. It owns `mode` ("operate" | "learn") and `view` (overview vs. station detail) state, and is composed of `PressOverview` (SVG) and `StationDetail` (Canvas). `selectedChannelId` is lifted from ControlPanel to App so both the press model and the control panel stay in sync.

**Tech Stack:** React 19, TypeScript, SVG (inline JSX), Canvas 2D API with `requestAnimationFrame`, Vitest + Testing Library.

**Test command:** `/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/press/pressEducation.ts` | Component name + description strings |
| Create | `src/components/PressModel.tsx` | Container: mode toggle, view routing |
| Create | `src/components/PressModel.test.tsx` | PressModel unit tests |
| Create | `src/components/press/PressOverview.tsx` | SVG CI press schematic |
| Create | `src/components/press/PressOverview.test.tsx` | PressOverview unit tests |
| Create | `src/components/press/StationDetail.tsx` | Canvas single-station detail |
| Create | `src/components/press/StationDetail.test.tsx` | StationDetail unit tests |
| Modify | `src/App.tsx` | Add activeTab state, selectedChannelId state, tab bar |
| Modify | `src/App.test.tsx` | Add tab switching test |
| Modify | `src/components/ControlPanel.tsx` | Add onChannelSelect callback prop |
| Modify | `src/styles.css` | Tab bar, mode toggle, press model, callout styles |

---

### Task 1: Educational content (`pressEducation.ts`)

**Files:**
- Create: `src/components/press/pressEducation.ts`

- [ ] **Step 1: Write the file**

```ts
export type EducationEntry = { name: string; description: string };

export const PRESS_EDUCATION: Record<string, EducationEntry> = {
  ciDrum: {
    name: "Central Impression Drum",
    description:
      "A large precision-machined steel cylinder that all print stations print against. The web wraps around it so every color prints on a perfectly supported surface with the same impression reference — the key advantage of CI presses over in-line stack designs.",
  },
  aniloxRoll: {
    name: "Anilox Roll",
    description:
      "An engraved ceramic or chrome roller covered in billions of tiny cells. Each cell holds a precise volume of ink measured in BCM (billion cubic microns per square inch) and transfers it to the plate. The anilox is the primary control over how much ink reaches the substrate.",
  },
  doctorBlade: {
    name: "Doctor Blade",
    description:
      "A thin steel or polymer blade pressed against the anilox roll at a trailing angle. It wipes excess ink from the roll surface, leaving only the ink held inside the engraved cells. Blade material, angle, and contact pressure all affect metering precision.",
  },
  containmentBlade: {
    name: "Containment Blade",
    description:
      "The leading blade of the chambered ink system. It seals the front of the ink chamber against the anilox roll to prevent ink from escaping. Together with the doctor blade it forms the fully enclosed ink reservoir.",
  },
  inkChamber: {
    name: "Ink Chamber",
    description:
      "An enclosed reservoir that delivers ink to the anilox roll under controlled pressure. Ink is continuously pumped in and recirculated to maintain consistent viscosity and temperature. Chambered systems reduce ink waste and solvent evaporation compared to open ink pans.",
  },
  plateCylinder: {
    name: "Plate Cylinder",
    description:
      "Carries the photopolymer printing plate. Raised image areas on the plate pick up ink from the anilox and transfer it to the substrate at the nip point with the CI drum. Plate-to-substrate impression is a critical setting: too light gives weak transfer, too heavy causes dot gain and accelerated plate wear.",
  },
  web: {
    name: "Web (Substrate)",
    description:
      "The continuous roll of film, foil, or paper being printed. On a CI press the web wraps tightly around the central drum so each colour station prints on a dimensionally stable, well-supported surface, giving CI presses exceptional registration across all colours.",
  },
};
```

- [ ] **Step 2: Run tests (all existing should still pass)**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 51 tests pass (no new tests needed — this file is pure data with no logic to test).

- [ ] **Step 3: Commit**

```bash
git add src/components/press/pressEducation.ts
git commit -m "feat(press): add educational component descriptions"
```

---

### Task 2: `PressModel.tsx` container + tests

**Files:**
- Create: `src/components/PressModel.tsx`
- Create: `src/components/PressModel.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/PressModel.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { PressModel } from "./PressModel";

const baseProps = {
  job: snackPouchJob,
  settings: createInitialSettings(snackPouchJob),
  outcome: {
    density: 1.35, gain: 0,
    channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
    channelGain: { C: 0, M: 0, Y: 0, K: 0 },
    registerError: 0, dryingRisk: 20, wasteRate: 40,
    setupQuality: 85, defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
    coaching: [],
  },
  selectedChannelId: "C",
};

describe("PressModel", () => {
  it("renders Operate and Learn mode buttons", () => {
    render(<PressModel {...baseProps} />);
    expect(screen.getByRole("button", { name: "Operate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn" })).toBeInTheDocument();
  });

  it("defaults to Operate mode with overview visible", () => {
    render(<PressModel {...baseProps} />);
    expect(screen.getByRole("button", { name: "Operate" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
    expect(screen.queryByTestId("station-detail")).not.toBeInTheDocument();
  });

  it("switches to Learn mode when Learn button is clicked", () => {
    render(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Learn" }));
    expect(screen.getByRole("button", { name: "Learn" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Operate" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to station detail when a station is clicked", () => {
    render(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByTestId("station-C"));
    expect(screen.getByTestId("station-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("press-overview")).not.toBeInTheDocument();
  });

  it("returns to overview when back button is clicked", () => {
    render(<PressModel {...baseProps} />);
    fireEvent.click(screen.getByTestId("station-C"));
    fireEvent.click(screen.getByRole("button", { name: /back to press/i }));
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run src/components/PressModel.test.tsx
```

Expected: FAIL — `PressModel` not found.

- [ ] **Step 3: Write `PressModel.tsx`**

```tsx
// src/components/PressModel.tsx
import { useState } from "react";
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../domain/types";
import { PressOverview } from "./press/PressOverview";
import { StationDetail } from "./press/StationDetail";

export type PressMode = "operate" | "learn";
type PressView = { type: "overview" } | { type: "station"; channelId: ChannelId };

type PressModelProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  selectedChannelId: ChannelId;
};

export function PressModel({ job, settings, outcome, selectedChannelId }: PressModelProps) {
  const [mode, setMode] = useState<PressMode>("operate");
  const [view, setView] = useState<PressView>({ type: "overview" });

  return (
    <div className="press-model">
      <div className="press-model__toolbar">
        <button
          type="button"
          className={`press-mode-btn${mode === "operate" ? " press-mode-btn--active" : ""}`}
          aria-pressed={mode === "operate"}
          onClick={() => setMode("operate")}
        >
          Operate
        </button>
        <button
          type="button"
          className={`press-mode-btn${mode === "learn" ? " press-mode-btn--active" : ""}`}
          aria-pressed={mode === "learn"}
          onClick={() => setMode("learn")}
        >
          Learn
        </button>
      </div>

      {view.type === "overview" ? (
        <PressOverview
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          selectedChannelId={selectedChannelId}
          onStationClick={id => setView({ type: "station", channelId: id })}
        />
      ) : (
        <StationDetail
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          channelId={view.channelId}
          onBack={() => setView({ type: "overview" })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create stub `PressOverview.tsx`** (enough to pass tests — full implementation in Task 4)

```tsx
// src/components/press/PressOverview.tsx
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  onStationClick: (id: ChannelId) => void;
};

export function PressOverview({ job, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.initiallyActive || true);
  return (
    <div data-testid="press-overview">
      {activeChannels.map(ch => (
        <button
          key={ch.id}
          type="button"
          data-testid={`station-${ch.id}`}
          onClick={() => onStationClick(ch.id)}
        >
          {ch.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create stub `StationDetail.tsx`**

```tsx
// src/components/press/StationDetail.tsx
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  channelId: ChannelId;
  onBack: () => void;
};

export function StationDetail({ onBack }: Props) {
  return (
    <div data-testid="station-detail">
      <button type="button" onClick={onBack}>← Back to press</button>
      <canvas />
    </div>
  );
}
```

- [ ] **Step 6: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 56 tests pass (51 existing + 5 new PressModel tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/PressModel.tsx src/components/PressModel.test.tsx src/components/press/PressOverview.tsx src/components/press/StationDetail.tsx
git commit -m "feat(press): PressModel container with mode toggle and view routing"
```

---

### Task 3: CSS styles for all press model UI

**Files:**
- Modify: `src/styles.css` (append to end of file)

- [ ] **Step 1: Append styles to `src/styles.css`**

```css
/* ── Tab bar ───────────────────────────────────────────── */
.workspace-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #cbd5dd;
  background: #e8edf1;
}

.workspace-tab {
  padding: 8px 18px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #697784;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.1s, border-color 0.1s;
}

.workspace-tab--active {
  color: #0f6b78;
  border-bottom-color: #0f6b78;
  background: #fbfcfd;
}

.workspace-tab:not(.workspace-tab--active):hover {
  color: #1a2530;
}

/* ── Press model container ─────────────────────────────── */
.press-model {
  background: #fbfcfd;
  border: 1px solid #cbd5dd;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.press-model__toolbar {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* ── Mode toggle buttons ───────────────────────────────── */
.press-mode-btn {
  padding: 5px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #cbd5dd;
  background: #eef3f6;
  color: #697784;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.press-mode-btn--active {
  background: #0f6b78;
  color: #fff;
  border-color: #0f6b78;
}

/* ── SVG press overview ────────────────────────────────── */
.press-overview svg {
  display: block;
  width: 100%;
  height: auto;
}

.press-station {
  cursor: pointer;
}

.press-station:hover .station-ring {
  stroke-width: 3;
}

/* ── Learn mode tooltip ────────────────────────────────── */
.learn-tooltip {
  position: absolute;
  background: #1a2530;
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.78rem;
  line-height: 1.5;
  max-width: 260px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.learn-tooltip__name {
  font-weight: 700;
  font-size: 0.84rem;
  margin-bottom: 4px;
}

/* ── Station detail canvas wrapper ─────────────────────── */
.station-detail {
  position: relative;
}

.station-detail canvas {
  display: block;
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
}

.press-back-btn {
  font-size: 0.8rem;
  font-weight: 600;
  color: #697784;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0 0 8px 0;
  display: block;
}

.press-back-btn:hover {
  color: #1a2530;
}

/* ── Callout labels (absolutely positioned over canvas) ── */
.station-callout {
  position: absolute;
  background: #1a2530;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  line-height: 1.4;
}

.station-callout::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border: 3px solid transparent;
  border-top-color: #1a2530;
}

/* Learn mode callout variant */
.station-callout--learn {
  background: #0f6b78;
  max-width: 180px;
  white-space: normal;
  font-weight: 400;
  font-size: 0.7rem;
}

.station-callout--learn .callout-name {
  display: block;
  font-weight: 700;
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.station-callout--learn::after {
  border-top-color: #0f6b78;
}
```

- [ ] **Step 2: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 56 tests pass (CSS changes don't break tests).

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(press): add tab bar, mode toggle, and press model CSS"
```

---

### Task 4: `PressOverview.tsx` — SVG CI press schematic (static + operate mode)

**Files:**
- Modify: `src/components/press/PressOverview.tsx` (full replacement)
- Create: `src/components/press/PressOverview.test.tsx`

**Context:** The SVG is 800×450. The CI drum sits at (400, 170) with radius 140. Print stations are arranged radially along the bottom arc (135° → 45°, going through 90° = bottom of drum in screen coords). The web enters at 135°, wraps counterclockwise through 90°, exits at 45°. Unwind stand at (75, 375), rewind at (725, 375). Dryer unit is drawn near the rewind at (650, 290).

Key angle math:
- `toRad(deg)` converts degrees to radians
- Station at angle θ: `plateCx = 400 + (140+22+6)*cos(toRad(θ))`, `plateCy = 170 + (140+22+6)*sin(toRad(θ))`
- For N stations, station `i` is at `135 - i*(90/(N-1))` degrees (left=135° to right=45°; for N=1, use 90°)
- Entry point on drum at 135°: (400+140*cos(135°), 170+140*sin(135°)) ≈ (301, 269)
- Exit point on drum at 45°: (400+140*cos(45°), 170+140*sin(45°)) ≈ (499, 269)

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/press/PressOverview.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { PressOverview } from "./PressOverview";

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

describe("PressOverview", () => {
  it("renders an SVG element", () => {
    const { container } = render(<PressOverview {...makeProps()} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one station group per active channel", () => {
    render(<PressOverview {...makeProps()} />);
    expect(screen.getByTestId("station-C")).toBeInTheDocument();
    expect(screen.getByTestId("station-M")).toBeInTheDocument();
    expect(screen.getByTestId("station-Y")).toBeInTheDocument();
    expect(screen.getByTestId("station-K")).toBeInTheDocument();
  });

  it("calls onStationClick with the correct channelId when a station is clicked", () => {
    const onStationClick = vi.fn();
    render(<PressOverview {...makeProps({ onStationClick })} />);
    fireEvent.click(screen.getByTestId("station-M"));
    expect(onStationClick).toHaveBeenCalledWith("M");
  });

  it("highlights the selected station", () => {
    render(<PressOverview {...makeProps({ selectedChannelId: "K" })} />);
    const station = screen.getByTestId("station-K");
    expect(station).toHaveAttribute("data-selected", "true");
  });

  it("shows component labels in learn mode", () => {
    render(<PressOverview {...makeProps({ mode: "learn" })} />);
    expect(screen.getByText("Central Impression Drum")).toBeInTheDocument();
    expect(screen.getAllByText("Anilox Roll").length).toBeGreaterThan(0);
  });

  it("does not show component labels in operate mode", () => {
    render(<PressOverview {...makeProps({ mode: "operate" })} />);
    expect(screen.queryByText("Central Impression Drum")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run src/components/press/PressOverview.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement `PressOverview.tsx`**

```tsx
// src/components/press/PressOverview.tsx
import { useState } from "react";
import type { ChannelId, ChannelDef, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { PRESS_EDUCATION } from "./pressEducation";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  onStationClick: (id: ChannelId) => void;
};

const SVG_W = 800;
const SVG_H = 450;
const DRUM_CX = 400;
const DRUM_CY = 170;
const DRUM_R = 140;
const PLATE_R = 22;
const ANILOX_R = 16;
const CHAMBER_W = 36;
const CHAMBER_H = 24;
// Distance from drum center to plate cylinder center
const STATION_DIST = DRUM_R + PLATE_R + 6;
// Distance from drum center to anilox center
const ANILOX_DIST = STATION_DIST + PLATE_R + ANILOX_R + 4;

const UNWIND_X = 75;
const UNWIND_Y = 375;
const REWIND_X = 725;
const REWIND_Y = 375;

// Dryer: fixed position near rewind side
const DRYER_X = 650;
const DRYER_Y = 290;
const DRYER_W = 46;
const DRYER_H = 28;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// Station arc: 135° (entry/left) to 45° (exit/right), stations go left→right
function stationAngleDeg(index: number, total: number): number {
  if (total === 1) return 90;
  return 135 - (index / (total - 1)) * 90;
}

function stationPos(deg: number, dist: number) {
  return {
    x: DRUM_CX + dist * Math.cos(toRad(deg)),
    y: DRUM_CY + dist * Math.sin(toRad(deg)),
  };
}

function stationHealthColor(density: number, target: number): string {
  const ratio = Math.abs(density - target) / target;
  if (ratio <= 0.1) return "#22a559";
  if (ratio <= 0.25) return "#e08c00";
  return "#d63b3b";
}

// Web tension: low=0, high=1; affects sag on approach/exit paths
function tensionNorm(webTension: number, min: number, max: number): number {
  return (webTension - min) / (max - min);
}

// Registration arrow: returns (dx, dy) from station center scaled for display
function regArrow(reg: { x: number; y: number } | undefined): { dx: number; dy: number; show: boolean } {
  if (!reg) return { dx: 0, dy: 0, show: false };
  const show = Math.abs(reg.x) > 0.5 || Math.abs(reg.y) > 0.5;
  return { dx: reg.x * 3, dy: reg.y * 3, show };
}

// Dryer color based on drying risk %
function dryerColor(dryingRisk: number): string {
  if (dryingRisk < 40) return "#7ec8d3";
  if (dryingRisk < 70) return "#e08c00";
  return "#d63b3b";
}

type TooltipState = { key: string; x: number; y: number } | null;

export function PressOverview({ job, settings, outcome, mode, selectedChannelId, onStationClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
  const tn = tensionNorm(
    settings.webTension,
    job.ranges.webTension.min,
    job.ranges.webTension.max,
  );

  // Entry/exit points on drum circumference
  const entryX = DRUM_CX + DRUM_R * Math.cos(toRad(135));
  const entryY = DRUM_CY + DRUM_R * Math.sin(toRad(135));
  const exitX  = DRUM_CX + DRUM_R * Math.cos(toRad(45));
  const exitY  = DRUM_CY + DRUM_R * Math.sin(toRad(45));

  // Sag control: high tension = no sag, low tension = 30px sag
  const sag = (1 - tn) * 30;
  const leftMidX = (UNWIND_X + entryX) / 2;
  const leftMidY = (UNWIND_Y + entryY) / 2 + sag;
  const rightMidX = (exitX + REWIND_X) / 2;
  const rightMidY = (exitY + REWIND_Y) / 2 + sag;

  function handleLabelClick(key: string, x: number, y: number) {
    if (mode !== "learn") return;
    setTooltip(prev => prev?.key === key ? null : { key, x, y });
  }

  return (
    <div className="press-overview" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
        {/* Web: approach from unwind */}
        <path
          d={`M ${UNWIND_X} ${UNWIND_Y} Q ${leftMidX} ${leftMidY} ${entryX} ${entryY}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />
        {/* Web: arc around drum (counterclockwise from 135° to 45° through 90°) */}
        <path
          d={`M ${entryX} ${entryY} A ${DRUM_R} ${DRUM_R} 0 0 0 ${exitX} ${exitY}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />
        {/* Web: exit to rewind */}
        <path
          d={`M ${exitX} ${exitY} Q ${rightMidX} ${rightMidY} ${REWIND_X} ${REWIND_Y}`}
          fill="none" stroke="#b0bec5" strokeWidth="6"
        />

        {/* CI Drum */}
        <circle cx={DRUM_CX} cy={DRUM_CY} r={DRUM_R} fill="#e8edf1" stroke="#697784" strokeWidth="2" />
        <text x={DRUM_CX} y={DRUM_CY + 6} textAnchor="middle" fontSize="11" fill="#697784" fontWeight="600">
          CI Drum
        </text>
        {mode === "learn" && (
          <text
            x={DRUM_CX} y={DRUM_CY - DRUM_R - 10}
            textAnchor="middle" fontSize="11" fill="#0f6b78" fontWeight="700"
            style={{ cursor: "pointer" }}
            onClick={e => handleLabelClick("ciDrum", DRUM_CX, DRUM_CY - DRUM_R - 30)}
          >
            Central Impression Drum
          </text>
        )}

        {/* Unwind stand */}
        <rect x={UNWIND_X - 14} y={UNWIND_Y - 24} width="28" height="28" rx="4"
          fill="#dde4ea" stroke="#697784" strokeWidth="1.5" />
        <circle cx={UNWIND_X} cy={UNWIND_Y - 10} r="10" fill="#b0bec5" stroke="#697784" strokeWidth="1" />
        <text x={UNWIND_X} y={UNWIND_Y + 18} textAnchor="middle" fontSize="10" fill="#697784">
          Unwind
        </text>

        {/* Rewind stand */}
        <rect x={REWIND_X - 14} y={REWIND_Y - 24} width="28" height="28" rx="4"
          fill="#dde4ea" stroke="#697784" strokeWidth="1.5" />
        <circle cx={REWIND_X} cy={REWIND_Y - 10} r="10" fill="#b0bec5" stroke="#697784" strokeWidth="1" />
        <text x={REWIND_X} y={REWIND_Y + 18} textAnchor="middle" fontSize="10" fill="#697784">
          Rewind
        </text>

        {/* Dryer unit */}
        <rect
          x={DRYER_X - DRYER_W / 2} y={DRYER_Y - DRYER_H / 2}
          width={DRYER_W} height={DRYER_H} rx="4"
          fill={dryerColor(outcome.dryingRisk)} stroke="#697784" strokeWidth="1.5"
          style={{ cursor: mode === "learn" ? "pointer" : "default" }}
          onClick={() => handleLabelClick("dryer", DRYER_X, DRYER_Y - DRYER_H / 2 - 20)}
        />
        <text x={DRYER_X} y={DRYER_Y + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="600">
          DRYER
        </text>
        <text x={DRYER_X} y={DRYER_Y + DRYER_H / 2 + 14} textAnchor="middle" fontSize="9" fill="#697784">
          {outcome.dryingRisk}%
        </text>

        {/* Print stations */}
        {activeChannels.map((ch, i) => {
          const deg = stationAngleDeg(i, activeChannels.length);
          const plate = stationPos(deg, STATION_DIST);
          const anilox = stationPos(deg, ANILOX_DIST);
          const density = outcome.channelDensity[ch.id] ?? 0;
          const healthColor = stationHealthColor(density, ch.targetDensity);
          const reg = regArrow(settings.registration[ch.id]);
          const isSelected = ch.id === selectedChannelId;

          return (
            <g
              key={ch.id}
              className="press-station"
              data-testid={`station-${ch.id}`}
              data-selected={isSelected}
              onClick={() => onStationClick(ch.id)}
              role="button"
              aria-label={ch.name}
            >
              {/* Health ring */}
              <circle
                className="station-ring"
                cx={plate.x} cy={plate.y} r={PLATE_R + 6}
                fill="none"
                stroke={isSelected ? "#0f6b78" : healthColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isSelected ? undefined : "none"}
              />
              {/* Plate cylinder */}
              <circle cx={plate.x} cy={plate.y} r={PLATE_R}
                fill={ch.displayColor + "44"} stroke={ch.displayColor} strokeWidth="1.5" />
              {/* Anilox roll */}
              <circle cx={anilox.x} cy={anilox.y} r={ANILOX_R}
                fill="#dde4ea" stroke="#697784" strokeWidth="1" />
              {/* Channel label */}
              <text x={plate.x} y={plate.y + 4} textAnchor="middle" fontSize="10"
                fill={ch.displayColor} fontWeight="800">
                {ch.id.length === 1 ? ch.id : ch.id.slice(0, 2).toUpperCase()}
              </text>
              {/* Registration arrow */}
              {reg.show && (
                <line
                  x1={plate.x} y1={plate.y}
                  x2={plate.x + reg.dx} y2={plate.y + reg.dy}
                  stroke="#d63b3b" strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )}
              {/* Learn mode label */}
              {mode === "learn" && (
                <text
                  x={anilox.x} y={anilox.y - ANILOX_R - 6}
                  textAnchor="middle" fontSize="9" fill="#0f6b78" fontWeight="700"
                  onClick={e => { e.stopPropagation(); handleLabelClick("aniloxRoll", anilox.x, anilox.y - ANILOX_R - 20); }}
                >
                  Anilox Roll
                </text>
              )}
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#d63b3b" />
          </marker>
        </defs>
      </svg>

      {/* Learn mode tooltip */}
      {tooltip && PRESS_EDUCATION[tooltip.key] && (
        <div
          className="learn-tooltip"
          style={{ top: tooltip.y, left: Math.min(tooltip.x, SVG_W - 280) }}
          onClick={() => setTooltip(null)}
        >
          <div className="learn-tooltip__name">{PRESS_EDUCATION[tooltip.key].name}</div>
          {PRESS_EDUCATION[tooltip.key].description}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 62 tests pass (56 + 6 new PressOverview tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/press/PressOverview.tsx src/components/press/PressOverview.test.tsx
git commit -m "feat(press): SVG CI press overview with reactive states and learn mode"
```

---

### Task 5: `StationDetail.tsx` — canvas static layout + callout labels

**Files:**
- Modify: `src/components/press/StationDetail.tsx` (full replacement)
- Create: `src/components/press/StationDetail.test.tsx`

**Context:** The canvas is 540×430 logical pixels at SCALE=2 (canvas buffer = 1080×860). Components from top to bottom: ink chamber (with doctor and containment blades) → anilox roll → plate cylinder → web → CI drum arc. The CI drum arc is a large partial circle whose center is far below the canvas, giving the illusion of a massive drum. All canvas drawing uses coordinates multiplied by SCALE.

Constants:
```ts
const SD_W = 540;
const SD_H = 430;
const SD_SCALE = 2;
const PLATE_CX = 270; const PLATE_CY = 315; const PLATE_R = 52;
const ANILOX_CX = 270; const ANILOX_CY = 208; const ANILOX_R = 44;
const CHAMBER_X = 148; const CHAMBER_Y = 38; const CHAMBER_W = 244; const CHAMBER_H = 140;
const CI_CX = 270; const CI_CY = 710; const CI_R = 385;
// webY depends on impression setting
function webY(impression: number) { return PLATE_CY + PLATE_R + Math.max(0, Math.round(16 - impression * 0.16)); }
// impression=0 → webY=383; impression=100 → webY=367
```

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/press/StationDetail.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../../domain/jobs";
import { createInitialSettings } from "../../domain/settings";
import { StationDetail } from "./StationDetail";

function makeProps(overrides = {}) {
  return {
    job: snackPouchJob,
    settings: createInitialSettings(snackPouchJob),
    outcome: {
      density: 1.35, gain: 0,
      channelDensity: { C: 1.4, M: 1.4, Y: 1.0, K: 1.6 },
      channelGain: { C: 0, M: 0, Y: 0, K: 0 },
      registerError: 0, dryingRisk: 20, wasteRate: 40, setupQuality: 85,
      defects: { pinholes: 0, dirtyPrint: 0, mottle: 0, skips: 0, edgeSquash: 0 },
      coaching: [],
    },
    mode: "operate" as const,
    channelId: "C",
    onBack: vi.fn(),
    ...overrides,
  };
}

describe("StationDetail", () => {
  it("renders a canvas element", () => {
    const { container } = render(<StationDetail {...makeProps()} />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("fires onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<StationDetail {...makeProps({ onBack })} />);
    fireEvent.click(screen.getByRole("button", { name: /back to press/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows operate mode callout labels", () => {
    render(<StationDetail {...makeProps()} />);
    expect(screen.getByTestId("callout-anilox")).toBeInTheDocument();
    expect(screen.getByTestId("callout-viscosity")).toBeInTheDocument();
    expect(screen.getByTestId("callout-impression")).toBeInTheDocument();
    expect(screen.getByTestId("callout-strength")).toBeInTheDocument();
  });

  it("callout shows correct anilox BCM value from settings", () => {
    render(<StationDetail {...makeProps()} />);
    const callout = screen.getByTestId("callout-anilox");
    expect(callout.textContent).toContain("4.5");
  });

  it("shows learn mode component labels instead of callouts", () => {
    render(<StationDetail {...makeProps({ mode: "learn" })} />);
    expect(screen.getByTestId("learn-label-aniloxRoll")).toBeInTheDocument();
    expect(screen.getByTestId("learn-label-plateCylinder")).toBeInTheDocument();
    expect(screen.getByTestId("learn-label-inkChamber")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run src/components/press/StationDetail.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement `StationDetail.tsx`**

```tsx
// src/components/press/StationDetail.tsx
import { useEffect, useRef } from "react";
import type { ChannelDef, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";
import { PRESS_EDUCATION } from "./pressEducation";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  channelId: string;
  onBack: () => void;
};

const SD_W = 540;
const SD_H = 430;
const SD_SCALE = 2;

const PLATE_CX = 270;
const PLATE_CY = 315;
const PLATE_R = 52;

const ANILOX_CX = 270;
const ANILOX_CY = 208;
const ANILOX_R = 44;

const CHAMBER_X = 148;
const CHAMBER_Y = 38;
const CHAMBER_W = 244;
const CHAMBER_H = 140;

const CI_CX = 270;
const CI_CY = 710;
const CI_R = 385;

function webY(impression: number): number {
  return PLATE_CY + PLATE_R + Math.max(0, Math.round(16 - impression * 0.16));
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  ch: ChannelDef,
  inkSettings: { aniloxVolume: number; viscosity: number; strength: number; impression: number } | undefined,
  aniloxAngle: number,
  dripY: number,
  mode: PressMode,
  dryingRisk: number,
) {
  const s = SD_SCALE;
  ctx.clearRect(0, 0, SD_W * s, SD_H * s);

  const impression = inkSettings?.impression ?? 54;
  const aniloxVolume = inkSettings?.aniloxVolume ?? 3.2;
  const viscosity = inkSettings?.viscosity ?? 28;
  const strength = inkSettings?.strength ?? 100;
  const wy = webY(impression);

  // Background
  ctx.fillStyle = "#f4f7f9";
  ctx.fillRect(0, 0, SD_W * s, SD_H * s);

  // ── CI drum arc ──────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(CI_CX * s, CI_CY * s, CI_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#dde4ea";
  ctx.fill();
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // ── Web ──────────────────────────────────────────────────
  ctx.fillStyle = "#b0bec5";
  ctx.fillRect(0, wy * s, SD_W * s, 10 * s);

  // ── Plate cylinder ───────────────────────────────────────
  // Plate squash: at very high impression, tint the contact area
  if (impression > 80) {
    ctx.beginPath();
    ctx.arc(PLATE_CX * s, PLATE_CY * s, (PLATE_R + 2) * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214,59,59,0.15)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(PLATE_CX * s, PLATE_CY * s, PLATE_R * s, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.2);
  ctx.fill();
  ctx.strokeStyle = ch.displayColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  // Plate label
  ctx.fillStyle = ch.displayColor;
  ctx.font = `bold ${11 * s}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Plate", PLATE_CX * s, (PLATE_CY + 5) * s);

  // ── Anilox roll ──────────────────────────────────────────
  // Outer circle
  ctx.beginPath();
  ctx.arc(ANILOX_CX * s, ANILOX_CY * s, ANILOX_R * s, 0, Math.PI * 2);
  ctx.fillStyle = "#e8edf1";
  ctx.fill();
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Cell texture: concentric dots suggesting engraving, rotated by aniloxAngle
  const cellAlpha = 0.3 + (aniloxVolume / 5.5) * 0.6; // deeper cells = darker
  ctx.save();
  ctx.translate(ANILOX_CX * s, ANILOX_CY * s);
  ctx.rotate((aniloxAngle * Math.PI) / 180);
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const cx = col * 10 * s;
      const cy = row * 10 * s;
      if (Math.sqrt(cx * cx + cy * cy) < (ANILOX_R - 4) * s) {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(ch.displayColor, cellAlpha);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Ink drip ─────────────────────────────────────────────
  // Drip from chamber bottom to anilox surface
  const dripRadius = Math.max(2, 5 - viscosity * 0.06);
  ctx.beginPath();
  ctx.arc(
    (CHAMBER_X + CHAMBER_W / 2) * s,
    dripY * s,
    dripRadius * s, 0, Math.PI * 2,
  );
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.8);
  ctx.fill();

  // ── Ink chamber ──────────────────────────────────────────
  const chamberFill = 0.2 + (strength / 120) * 0.6;
  // Chamber body
  ctx.fillStyle = `rgba(245,248,250,0.95)`;
  ctx.strokeStyle = "#697784";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.roundRect(CHAMBER_X * s, CHAMBER_Y * s, CHAMBER_W * s, CHAMBER_H * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  // Ink fill inside chamber
  const fillH = CHAMBER_H * chamberFill;
  ctx.fillStyle = hexToRgba(ch.displayColor, 0.55);
  ctx.beginPath();
  ctx.roundRect(
    (CHAMBER_X + 2) * s,
    (CHAMBER_Y + CHAMBER_H - fillH) * s,
    (CHAMBER_W - 4) * s,
    (fillH - 2) * s,
    [0, 0, 3 * s, 3 * s],
  );
  ctx.fill();

  // Doctor blade: diagonal from bottom-right of chamber to anilox surface
  const doctorWarning = impression > 80 || viscosity > 38;
  ctx.strokeStyle = doctorWarning ? "#e08c00" : "#455a64";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo((CHAMBER_X + CHAMBER_W) * s, (CHAMBER_Y + CHAMBER_H) * s);
  ctx.lineTo((ANILOX_CX + ANILOX_R - 4) * s, (ANILOX_CY + 8) * s);
  ctx.stroke();

  // Containment blade: diagonal from bottom-left of chamber to anilox surface
  const containmentWarning = mode === "operate" && dryingRisk > 65;
  ctx.strokeStyle = containmentWarning ? "#e08c00" : "#455a64";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(CHAMBER_X * s, (CHAMBER_Y + CHAMBER_H) * s);
  ctx.lineTo((ANILOX_CX - ANILOX_R + 4) * s, (ANILOX_CY + 8) * s);
  ctx.stroke();

  // Blade labels in operate mode if warning
  if (doctorWarning && mode === "operate") {
    ctx.fillStyle = "#e08c00";
    ctx.font = `bold ${9 * s}px Inter, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("!", (ANILOX_CX + ANILOX_R + 2) * s, (ANILOX_CY + 10) * s);
  }
}

// Callout position definitions: key → { label, x, y, getValue }
type CalloutDef = {
  key: string;
  label: string;
  x: number;
  y: number;
};

const OPERATE_CALLOUTS: CalloutDef[] = [
  { key: "anilox",     label: "Anilox",     x: 360, y: 195 },
  { key: "viscosity",  label: "Viscosity",  x: 40,  y: 195 },
  { key: "impression", label: "Impression", x: 360, y: 320 },
  { key: "strength",   label: "Strength",   x: 40,  y: 320 },
];

const LEARN_LABELS: { key: string; educationKey: string; x: number; y: number }[] = [
  { key: "inkChamber",       educationKey: "inkChamber",       x: 40,  y: 50  },
  { key: "doctorBlade",      educationKey: "doctorBlade",      x: 400, y: 155 },
  { key: "containmentBlade", educationKey: "containmentBlade", x: 40,  y: 155 },
  { key: "aniloxRoll",       educationKey: "aniloxRoll",       x: 360, y: 185 },
  { key: "plateCylinder",    educationKey: "plateCylinder",    x: 360, y: 305 },
  { key: "web",              educationKey: "web",              x: 360, y: 370 },
  { key: "ciDrum",           educationKey: "ciDrum",           x: 360, y: 405 },
];

export function StationDetail({ job, settings, outcome, mode, channelId, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const aniloxAngleRef = useRef(0);
  const dripYRef = useRef(CHAMBER_Y + CHAMBER_H + 5);

  const ch = job.channels.find(c => c.id === channelId) ?? job.channels[0];
  const inkSettings = settings.inkChannels[channelId];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viscosity = inkSettings?.viscosity ?? 28;
    const dripSpeed = 2.5 / (viscosity / 28);
    const dripTarget = (ANILOX_CY - ANILOX_R) - 2;

    function tick() {
      aniloxAngleRef.current = (aniloxAngleRef.current + 0.6) % 360;
      dripYRef.current += dripSpeed;
      if (dripYRef.current > dripTarget) {
        dripYRef.current = CHAMBER_Y + CHAMBER_H + 5;
      }
      drawFrame(ctx!, ch, inkSettings, aniloxAngleRef.current, dripYRef.current, mode, outcome.dryingRisk);
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [ch, inkSettings, mode]);

  return (
    <div className="station-detail" style={{ position: "relative" }}>
      <button type="button" className="press-back-btn" onClick={onBack}>
        ← Back to press
      </button>
      <div style={{ position: "relative", maxWidth: SD_W }}>
        <canvas
          ref={canvasRef}
          width={SD_W * SD_SCALE}
          height={SD_H * SD_SCALE}
          style={{ width: SD_W, height: SD_H }}
        />

        {/* Operate mode callouts */}
        {mode === "operate" && OPERATE_CALLOUTS.map(c => {
          let value = "";
          if (c.key === "anilox")     value = `${inkSettings?.aniloxVolume ?? "—"} BCM`;
          if (c.key === "viscosity")  value = `${inkSettings?.viscosity ?? "—"} s`;
          if (c.key === "impression") value = `${inkSettings?.impression ?? "—"}%`;
          if (c.key === "strength")   value = `${inkSettings?.strength ?? "—"}%`;
          return (
            <div
              key={c.key}
              data-testid={`callout-${c.key}`}
              className="station-callout"
              style={{ top: c.y, left: c.x }}
            >
              <span style={{ opacity: 0.7, fontSize: "0.65rem", display: "block" }}>{c.label}</span>
              {value}
            </div>
          );
        })}

        {/* Learn mode labels */}
        {mode === "learn" && LEARN_LABELS.map(l => (
          <div
            key={l.key}
            data-testid={`learn-label-${l.key}`}
            className="station-callout station-callout--learn"
            style={{ top: l.y, left: l.x }}
          >
            <span className="callout-name">
              {PRESS_EDUCATION[l.educationKey]?.name ?? l.key}
            </span>
            {PRESS_EDUCATION[l.educationKey]?.description}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 68 tests pass (62 + 6 new StationDetail tests). Note: canvas drawing internals are not tested.

- [ ] **Step 5: Commit**

```bash
git add src/components/press/StationDetail.tsx src/components/press/StationDetail.test.tsx
git commit -m "feat(press): Canvas station detail with animation, reactive states, and callout labels"
```

---

### Task 6: App.tsx — tab bar, `selectedChannelId` lift, ControlPanel callback

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ControlPanel.tsx`
- Modify: `src/App.test.tsx`

**Context:**

`ControlPanel` currently holds `selectedId` state internally. We add an optional `onChannelSelect` prop that fires whenever the selected channel changes. `App` stores `selectedChannelId` separately and passes it to `PressModel`.

`App` adds `activeTab: "output" | "press"` state. A two-button tab bar renders inside `.print-workspace` above the canvas/press panel. `CoachPanel` stays below both tabs.

- [ ] **Step 1: Add `onChannelSelect` to `ControlPanel.tsx`**

In `ControlPanel.tsx`, update the `ControlPanelProps` type and usages:

```tsx
// Add to ControlPanelProps:
onChannelSelect?: (id: ChannelId) => void;

// Replace the useState for selectedId:
const [selectedId, setSelectedId] = useState<ChannelId>(firstActive?.id ?? "C");

// Add a helper to call both:
function selectChannel(id: ChannelId) {
  setSelectedId(id);
  onChannelSelect?.(id);
}
```

Replace every `setSelectedId(ch.id)` / `setSelectedId(id)` call in the component with `selectChannel(...)`. There are two locations:
1. The color swatch button: `onClick={() => selectChannel(ch.id)}`

- [ ] **Step 2: Update `App.tsx`**

Add these state declarations after the existing `useState` calls:

```tsx
const [activeTab, setActiveTab] = useState<"output" | "press">("output");
const [selectedChannelId, setSelectedChannelId] = useState<ChannelId>(
  snackPouchJob.channels.find(ch => ch.initiallyActive)?.id ?? "C"
);
```

Update `switchJob` to reset `selectedChannelId`:

```tsx
function switchJob(job: JobPreset) {
  setSelectedJob(job);
  setSettings(createInitialSettings(job));
  setScore(null);
  setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
}
```

Add `PressModel` import:

```tsx
import { PressModel } from "./components/PressModel";
```

Replace the `.print-workspace` div in the JSX:

```tsx
<div className="print-workspace">
  <div className="workspace-tabs">
    <button
      type="button"
      className={`workspace-tab${activeTab === "output" ? " workspace-tab--active" : ""}`}
      onClick={() => setActiveTab("output")}
    >
      Printed Output
    </button>
    <button
      type="button"
      className={`workspace-tab${activeTab === "press" ? " workspace-tab--active" : ""}`}
      onClick={() => setActiveTab("press")}
    >
      Press Model
    </button>
  </div>
  {activeTab === "output" ? (
    <PrintPreview settings={settings} outcome={outcome} job={selectedJob} />
  ) : (
    <PressModel
      job={selectedJob}
      settings={settings}
      outcome={outcome}
      selectedChannelId={selectedChannelId}
    />
  )}
  <CoachPanel messages={coaching} mode={mode} onModeChange={setMode} />
</div>
```

Add `onChannelSelect={setSelectedChannelId}` to the `<ControlPanel>` element.

- [ ] **Step 3: Write the failing test in `App.test.tsx`**

Add this test to `App.test.tsx`:

```tsx
it("switches to press model tab when Press Model button is clicked", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Press Model" }));
  expect(screen.getByTestId("press-overview")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run all tests**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 69 tests pass (68 + 1 new App test).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/ControlPanel.tsx src/App.test.tsx
git commit -m "feat(press): tab bar, selectedChannelId lifted to App, ControlPanel onChannelSelect"
```

---

### Task 7: Final verification and push

**Files:** none

- [ ] **Step 1: Run full test suite**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/vitest run
```

Expected: 69 tests pass.

- [ ] **Step 2: TypeScript check**

```
/Users/robertcongdon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```

Expected: push succeeds.
