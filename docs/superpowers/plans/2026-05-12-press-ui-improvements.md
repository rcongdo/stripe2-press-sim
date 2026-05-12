# Press UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract SVG print preview with a canvas-based CMYK halftone simulation, merge the two anilox sliders into a 6-option linked dropdown, and replace the 8 registration sliders with a color-select + directional-pad UI.

**Architecture:** Three independent UI changes to `ControlPanel.tsx` and `PrintPreview.tsx`. Domain layer gains an `AniloxPreset` type and preset list in `jobs.ts`. `App.tsx` gets one new handler (`onAniloxPresetChange`). No changes to the simulation engine or scoring.

**Tech Stack:** React, TypeScript, HTML Canvas 2D API, Vitest, Testing Library.

---

## File Structure

- Modify: `src/domain/types.ts` — add `AniloxPreset` type
- Modify: `src/domain/jobs.ts` — add `aniloxPresets` array; update `initialSettings` anilox values to match a valid preset
- Modify: `src/App.tsx` — add `onAniloxPresetChange` handler
- Modify: `src/components/ControlPanel.tsx` — anilox dropdown + registration dpad; add `onAniloxPresetChange` prop
- Create: `src/components/ControlPanel.test.tsx` — test dropdown and dpad behavior
- Modify: `src/components/PrintPreview.tsx` — replace SVG with canvas halftone renderer
- Modify: `src/components/PrintPreview.test.tsx` — update assertions for canvas
- Modify: `src/styles.css` — add `.reg-dpad`, `.reg-colors`, `.anilox-select` styles

---

## Task 1: AniloxPreset domain model

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/jobs.ts`

- [ ] **Step 1: Add AniloxPreset type**

In `src/domain/types.ts`, add after the `SettingRange` type:

```ts
export type AniloxPreset = {
  id: string;
  label: string;
  lineScreen: number;
  volume: number;
};
```

- [ ] **Step 2: Add anilox presets and update initial settings**

Replace the `starterJob` export in `src/domain/jobs.ts` with:

```ts
import type { AniloxPreset, JobPreset } from "./types";

export const aniloxPresets: AniloxPreset[] = [
  { id: "ultra-fine",   label: "Ultra-fine — 1400 lpi / 1.8 BCM",  lineScreen: 1400, volume: 1.8 },
  { id: "fine",         label: "Fine — 1200 lpi / 2.4 BCM",        lineScreen: 1200, volume: 2.4 },
  { id: "standard",     label: "Standard — 1000 lpi / 3.2 BCM",    lineScreen: 1000, volume: 3.2 },
  { id: "medium-heavy", label: "Medium-heavy — 900 lpi / 3.8 BCM", lineScreen: 900,  volume: 3.8 },
  { id: "heavy",        label: "Heavy — 800 lpi / 4.5 BCM",        lineScreen: 800,  volume: 4.5 },
  { id: "very-heavy",   label: "Very heavy — 700 lpi / 5.2 BCM",   lineScreen: 700,  volume: 5.2 },
];

export const starterJob: JobPreset = {
  id: "snack-pouch-cmyk",
  name: "Snack Pouch Film",
  description: "Four-color process setup on PET film for a flexible packaging job.",
  substrateOptions: ["pet-film", "opp-film", "paper-laminate"],
  ranges: {
    aniloxVolume:     { min: 1.8, max: 5.5,  step: 0.1, unit: "BCM", label: "Anilox volume" },
    aniloxLineScreen: { min: 700, max: 1400,  step: 50,  unit: "lpi", label: "Anilox line screen" },
    inkViscosity:     { min: 18,  max: 45,    step: 1,   unit: "s",   label: "Ink viscosity" },
    inkStrength:      { min: 70,  max: 120,   step: 1,   unit: "%",   label: "Ink strength" },
    impression:       { min: 0,   max: 100,   step: 1,   unit: "%",   label: "Impression" },
    webTension:       { min: 20,  max: 80,    step: 1,   unit: "pli", label: "Web tension" },
    dryerTemperature: { min: 80,  max: 180,   step: 5,   unit: "F",   label: "Dryer temperature" },
    pressSpeed:       { min: 300, max: 1200,  step: 10,  unit: "fpm", label: "Press speed" },
  },
  target: {
    density: 1,
    gain: 0.18,
    dryingCapacity: 0.72,
    tension: 50,
    speed: 650,
    aniloxVolume: 3.2,
    inkViscosity: 28,
    impression: 54,
  },
  initialSettings: {
    substrate: "pet-film",
    aniloxVolume: 4.5,
    aniloxLineScreen: 800,
    inkViscosity: 31,
    inkStrength: 104,
    impression: 67,
    webTension: 38,
    dryerTemperature: 120,
    pressSpeed: 760,
    registration: {
      cyanX: -1.4,
      cyanY: 0.4,
      magentaX: 0.8,
      magentaY: -0.6,
      yellowX: 0.3,
      yellowY: 0.9,
      blackX: 0,
      blackY: 0,
    },
  },
};
```

- [ ] **Step 3: Run domain tests to confirm nothing broke**

Run:
```bash
npm test -- src/domain/settings.test.ts
```

Expected: PASS (5 tests). The settings test checks `impression` and `pressSpeed` initial values — neither changed. If it fails, check the `initialSettings` block was copied correctly.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/jobs.ts
git commit -m "feat: add anilox preset data model"
```

---

## Task 2: Anilox dropdown in ControlPanel

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ControlPanel.tsx`
- Create: `src/components/ControlPanel.test.tsx`

- [ ] **Step 1: Write failing ControlPanel tests**

Create `src/components/ControlPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { ControlPanel } from "./ControlPanel";

function makeProps(overrides: Partial<Parameters<typeof ControlPanel>[0]> = {}) {
  return {
    job: starterJob,
    settings: createInitialSettings(starterJob),
    onSettingChange: vi.fn(),
    onAniloxPresetChange: vi.fn(),
    onRegistrationChange: vi.fn(),
    ...overrides,
  };
}

describe("ControlPanel — anilox dropdown", () => {
  it("renders a single anilox select instead of two sliders", () => {
    render(<ControlPanel {...makeProps()} />);

    expect(screen.getByLabelText("Anilox roll")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox volume")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox line screen")).not.toBeInTheDocument();
  });

  it("calls onAniloxPresetChange with matched volume and lineScreen when selection changes", () => {
    const onAniloxPresetChange = vi.fn();
    render(<ControlPanel {...makeProps({ onAniloxPresetChange })} />);

    fireEvent.change(screen.getByLabelText("Anilox roll"), {
      target: { value: "standard" },
    });

    expect(onAniloxPresetChange).toHaveBeenCalledWith(3.2, 1000);
  });
});

describe("ControlPanel — registration dpad", () => {
  it("renders color selector buttons and no registration sliders", () => {
    render(<ControlPanel {...makeProps()} />);

    expect(screen.getByRole("button", { name: /cyan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /magenta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yellow/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /black/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("cyanX")).not.toBeInTheDocument();
  });

  it("nudges selected color X by +0.1 when right arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));

    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanX",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanX + 0.1, 5),
    );
  });

  it("nudges selected color Y by -0.1 when up arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /up/i }));

    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanY",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanY - 0.1, 5),
    );
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:
```bash
npm test -- src/components/ControlPanel.test.tsx
```

Expected: FAIL — `ControlPanel` does not yet accept `onAniloxPresetChange`, and the anilox select and dpad don't exist.

- [ ] **Step 3: Update App.tsx to pass onAniloxPresetChange**

In `src/App.tsx`, add the handler and pass it to `ControlPanel`. The full updated file:

```tsx
import { useMemo, useState } from "react";
import { CoachPanel } from "./components/CoachPanel";
import { ControlPanel } from "./components/ControlPanel";
import { MetricsStrip } from "./components/MetricsStrip";
import { PrintPreview } from "./components/PrintPreview";
import { ScoreModal } from "./components/ScoreModal";
import { starterJob } from "./domain/jobs";
import { createInitialSettings, updateSetting } from "./domain/settings";
import type { PressSettingKey, RegistrationKey, ScoreSummary } from "./domain/types";
import { simulatePress } from "./simulation/engine";
import { filterCoaching, scoreRun, type TrainingMode } from "./simulation/scoring";

export default function App() {
  const [settings, setSettings] = useState(() => createInitialSettings(starterJob));
  const [mode, setMode] = useState<TrainingMode>("guided");
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const outcome = useMemo(() => simulatePress(starterJob, settings), [settings]);
  const coaching = filterCoaching(outcome.coaching, mode);

  function handleSettingChange(key: PressSettingKey, value: number) {
    setSettings((current) => updateSetting(starterJob, current, key, value));
  }

  function handleAniloxPresetChange(volume: number, lineScreen: number) {
    setSettings((current) => ({
      ...current,
      aniloxVolume: volume,
      aniloxLineScreen: lineScreen,
    }));
  }

  function handleRegistrationChange(key: RegistrationKey, value: number) {
    setSettings((current) => ({
      ...current,
      registration: { ...current.registration, [key]: value },
    }));
  }

  function resetJob() {
    setSettings(createInitialSettings(starterJob));
    setScore(null);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Wide-web flexible packaging</p>
          <h1>Flexographic Press Simulator</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={resetJob}>
            Reset job
          </button>
          <button type="button" className="primary-button" onClick={() => setScore(scoreRun(outcome))}>
            Finish run
          </button>
        </div>
      </header>
      <MetricsStrip outcome={outcome} />
      <div className="simulator-grid">
        <div className="print-workspace">
          <PrintPreview settings={settings} outcome={outcome} />
          <CoachPanel messages={coaching} mode={mode} onModeChange={setMode} />
        </div>
        <ControlPanel
          job={starterJob}
          settings={settings}
          onSettingChange={handleSettingChange}
          onAniloxPresetChange={handleAniloxPresetChange}
          onRegistrationChange={handleRegistrationChange}
        />
      </div>
      <ScoreModal score={score} onClose={() => setScore(null)} onReset={resetJob} />
    </main>
  );
}
```

- [ ] **Step 4: Rewrite ControlPanel with anilox dropdown and registration dpad**

Replace `src/components/ControlPanel.tsx` entirely:

```tsx
import { useState } from "react";
import { aniloxPresets } from "../domain/jobs";
import type { JobPreset, PressSettingKey, PressSettings, RegistrationKey } from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onAniloxPresetChange: (volume: number, lineScreen: number) => void;
  onRegistrationChange: (key: RegistrationKey, value: number) => void;
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

const sliderKeys: PressSettingKey[] = [
  "inkViscosity",
  "inkStrength",
  "impression",
  "webTension",
  "dryerTemperature",
  "pressSpeed",
];

export function ControlPanel({
  job,
  settings,
  onSettingChange,
  onAniloxPresetChange,
  onRegistrationChange,
}: ControlPanelProps) {
  const [selectedColor, setSelectedColor] = useState<ColorName>("cyan");

  const currentPreset =
    aniloxPresets.find((p) => p.volume === settings.aniloxVolume) ?? aniloxPresets[4];

  function nudge(axis: "x" | "y", delta: number) {
    const key = colorKeys[selectedColor][axis];
    const current = settings.registration[key];
    onRegistrationChange(key, Math.min(2, Math.max(-2, parseFloat((current + delta).toFixed(1)))));
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
        <h3>Anilox roll</h3>
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
        <h3>Registration</h3>
        <div className="reg-colors">
          {(["cyan", "magenta", "yellow", "black"] as ColorName[]).map((color) => (
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
          <button type="button" className="reg-dpad__btn" aria-label="up" onClick={() => nudge("y", -0.1)}>↑</button>
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

- [ ] **Step 5: Add styles for new controls**

Append to `src/styles.css`:

```css
/* Anilox select */
.anilox-select select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5dd;
  border-radius: 6px;
  background: #fff;
  margin-top: 4px;
}

/* Registration color selector */
.reg-colors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.reg-color-btn {
  padding: 6px 4px;
  border-radius: 6px;
  border: 2px solid transparent;
  background: color-mix(in srgb, var(--swatch) 18%, #fff);
  color: var(--swatch);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.reg-color-btn--active {
  border-color: var(--swatch);
  background: color-mix(in srgb, var(--swatch) 28%, #fff);
}

/* Registration readout */
.reg-readout {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  margin-bottom: 10px;
  color: #53616d;
}

/* Registration dpad */
.reg-dpad {
  display: grid;
  grid-template-rows: auto auto auto;
  place-items: center;
  gap: 4px;
  width: fit-content;
  margin: 0 auto;
}

.reg-dpad__row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.reg-dpad__btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #cbd5dd;
  background: #eef3f6;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
}

.reg-dpad__center {
  width: 40px;
  height: 40px;
}
```

- [ ] **Step 6: Run ControlPanel tests**

Run:
```bash
npm test -- src/components/ControlPanel.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 7: Run full unit suite**

Run:
```bash
npm test
```

Expected: all 17 existing tests plus 5 new ControlPanel tests = 22 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/jobs.ts src/App.tsx src/components/ControlPanel.tsx src/components/ControlPanel.test.tsx src/styles.css
git commit -m "feat: anilox preset dropdown and registration directional pad"
```

---

## Task 3: Canvas halftone print preview

**Files:**
- Modify: `src/components/PrintPreview.tsx`
- Modify: `src/components/PrintPreview.test.tsx`

- [ ] **Step 1: Update PrintPreview tests**

Replace `src/components/PrintPreview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "../simulation/engine";
import { PrintPreview } from "./PrintPreview";

describe("PrintPreview", () => {
  it("renders the live print sample section with a canvas", () => {
    const settings = createInitialSettings(starterJob);
    const outcome = simulatePress(starterJob, settings);

    render(<PrintPreview settings={settings} outcome={outcome} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("print-canvas")).toBeInTheDocument();
    expect(screen.getByText(`${outcome.setupQuality}% setup quality`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run updated test to confirm it fails**

Run:
```bash
npm test -- src/components/PrintPreview.test.tsx
```

Expected: FAIL — `print-canvas` testid does not exist yet.

- [ ] **Step 3: Replace SVG with canvas halftone renderer**

Replace `src/components/PrintPreview.tsx` entirely:

```tsx
import { useEffect, useRef } from "react";
import type { PressSettings, Registration, SimulationOutcome } from "../domain/types";

type PrintPreviewProps = {
  settings: PressSettings;
  outcome: SimulationOutcome;
};

const W = 920;
const H = 420;
const PITCH = 12;
const MIL_TO_PX = 4;

type Zone = { x: number; y: number; w: number; h: number };

const ZONES: Zone[] = [
  { x: 20,  y: 20,  w: 880, h: 78  },  // brand header
  { x: 20,  y: 106, w: 880, h: 196 },  // product graphic
  { x: 20,  y: 310, w: 880, h: 52  },  // flavor stripe
  { x: 20,  y: 370, w: 880, h: 32  },  // nutrition bar
];

// CMYK coverage per zone [header, graphic, flavor, nutrition]
const COVERAGE: Record<string, [number, number, number, number]> = {
  C: [0.15, 0.60, 0.05, 0.05],
  M: [0.20, 0.50, 0.35, 0.05],
  Y: [0.10, 0.40, 0.70, 0.05],
  K: [0.85, 0.15, 0.55, 0.70],
};

const SCREEN_ANGLE: Record<string, number> = {
  C: (15 * Math.PI) / 180,
  M: (75 * Math.PI) / 180,
  Y: 0,
  K: (45 * Math.PI) / 180,
};

const INK_COLOR: Record<string, string> = {
  C: "rgb(0,190,220)",
  M: "rgb(220,0,150)",
  Y: "rgb(255,210,0)",
  K: "rgb(20,20,20)",
};

const REG_KEYS: Record<string, { x: keyof Registration; y: keyof Registration }> = {
  C: { x: "cyanX",    y: "cyanY" },
  M: { x: "magentaX", y: "magentaY" },
  Y: { x: "yellowX",  y: "yellowY" },
  K: { x: "blackX",   y: "blackY" },
};

function drawPlate(
  ctx: CanvasRenderingContext2D,
  channel: string,
  regX: number,
  regY: number,
  gain: number,
  density: number,
) {
  const angle = SCREEN_ANGLE[channel];
  const coverages = COVERAGE[channel];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = INK_COLOR[channel];
  ctx.globalAlpha = Math.min(1, Math.max(0.25, density));

  ZONES.forEach((zone, i) => {
    const coverage = coverages[i];
    if (coverage < 0.01) return;

    const radius = PITCH * 0.48 * Math.sqrt(coverage) * (1 + (gain - 0.18) * 1.5);
    if (radius <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(zone.x, zone.y, zone.w, zone.h);
    ctx.clip();

    const cx = zone.x + zone.w / 2 + regX;
    const cy = zone.y + zone.h / 2 + regY;
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const span = Math.ceil(Math.hypot(zone.w, zone.h) / 2) + PITCH;
    for (let dx = -span; dx <= span; dx += PITCH) {
      for (let dy = -span; dy <= span; dy += PITCH) {
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });

  ctx.restore();
}

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Substrate
    ctx.fillStyle = "#f6f1e8";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fffdf8";
    ctx.beginPath();
    ctx.roundRect(16, 16, W - 32, H - 32, 10);
    ctx.fill();

    // CMYK plates — Y before M before C before K (standard print order)
    for (const ch of ["Y", "M", "C", "K"]) {
      const regX = settings.registration[REG_KEYS[ch].x] * MIL_TO_PX;
      const regY = settings.registration[REG_KEYS[ch].y] * MIL_TO_PX;
      drawPlate(ctx, ch, regX, regY, outcome.gain, outcome.density);
    }

    // Pinhole defects — small white voids
    if (outcome.defects.pinholes > 0) {
      ctx.save();
      ctx.globalAlpha = outcome.defects.pinholes / 100;
      ctx.fillStyle = "#fffdf8";
      for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.arc(60 + ((i * 37) % 800), 30 + ((i * 53) % 360), 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Dirty print — horizontal ink slur streaks
    if (outcome.defects.dirtyPrint > 0) {
      ctx.save();
      ctx.globalAlpha = (outcome.defects.dirtyPrint / 100) * 0.4;
      ctx.fillStyle = "#1a1207";
      for (let i = 0; i < 28; i++) {
        ctx.fillRect(30 + ((i * 31) % 860), 22 + ((i * 43) % 376), 3 + (i % 6), 1);
      }
      ctx.restore();
    }

    // Mottle — uneven ink film (soft blotchy patches)
    if (outcome.defects.mottle > 0) {
      ctx.save();
      ctx.globalAlpha = (outcome.defects.mottle / 100) * 0.18;
      for (let i = 0; i < 12; i++) {
        const gx = 60 + ((i * 73) % 800);
        const gy = 30 + ((i * 59) % 360);
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40 + (i % 3) * 12);
        gr.addColorStop(0, "rgba(20,12,4,0.6)");
        gr.addColorStop(1, "rgba(20,12,4,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(gx - 52, gy - 52, 104, 104);
      }
      ctx.restore();
    }
  }, [settings, outcome]);

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", display: "block" }}
        aria-label="Simulated flexible packaging web"
        data-testid="print-canvas"
      />
    </section>
  );
}
```

- [ ] **Step 4: Run PrintPreview test**

Run:
```bash
npm test -- src/components/PrintPreview.test.tsx
```

Expected: PASS (1 test). Note: jsdom does not implement canvas drawing — `getContext("2d")` returns null, so the `useEffect` exits early and no draw calls are made. The test verifies the DOM structure only, which is correct for a unit test.

- [ ] **Step 5: Run full unit suite**

Run:
```bash
npm test
```

Expected: all 22 tests pass (17 original + 5 ControlPanel).

- [ ] **Step 6: Run TypeScript check**

Run:
```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run e2e smoke test**

Run:
```bash
npm run e2e
```

Expected: PASS. The Playwright test uses "Finish run" and "Practice" buttons and the impression slider — none of which changed structurally.

- [ ] **Step 8: Commit**

```bash
git add src/components/PrintPreview.tsx src/components/PrintPreview.test.tsx
git commit -m "feat: canvas halftone print preview with snack pouch layout"
```

---

## Self-Review Notes

- **Spec coverage:** All three requested changes are covered — canvas halftone (Task 3), anilox dropdown (Task 2), registration dpad (Tasks 2/styles).
- **Type consistency:** `AniloxPreset` defined in Task 1 Step 1, used in Task 2 Step 4. `RegistrationKey` used consistently throughout. `ColorName` local to `ControlPanel.tsx`.
- **Placeholder scan:** No TBDs. All code blocks are complete.
- **Known jsdom limitation:** Canvas drawing does not execute in tests — the PrintPreview test verifies DOM structure only. Visual correctness must be confirmed manually in the browser.
- **`roundRect` note:** `CanvasRenderingContext2D.roundRect` is available in Chrome 99+ / Node 18+. The Codex runtime is Node 24, and Playwright uses Chrome 148 — both support it.
