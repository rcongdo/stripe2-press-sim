# Flexographic Press Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version desktop web simulator that helps wide-web flexible packaging press operators practice basic flexographic press setup in a game-like, print-first sandbox.

**Architecture:** Use a Vite React TypeScript app with a pure simulation engine, an SVG-based print renderer, and a training UI layer. The engine owns settings, outcomes, coaching, and scoring; React components render controls, metrics, coaching, and the live print sample from engine data.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, Playwright, CSS modules or plain CSS.

---

## Current Workspace Note

The workspace is currently not a git repository, and `git init` failed with `Operation not permitted`. Commit steps are still included because the Superpowers workflow expects them. Run commit steps once the workspace permits creating `.git`, or record the same permission blocker if it persists.

## File Structure

- Create `package.json`: scripts and dependencies for Vite, React, tests, and browser checks.
- Create `index.html`: Vite entry HTML.
- Create `src/main.tsx`: React bootstrap.
- Create `src/App.tsx`: top-level simulator state, layout, reset, and finish-run behavior.
- Create `src/App.test.tsx`: UI interaction tests.
- Create `src/styles.css`: app layout, controls, print sample, metrics, and modal styling.
- Create `src/domain/types.ts`: domain types for jobs, settings, outcomes, coaching, and score summaries.
- Create `src/domain/jobs.ts`: starter flexible packaging job, setting ranges, defaults, and target windows.
- Create `src/domain/settings.ts`: clamping, reset defaults, and setting update helpers.
- Create `src/domain/settings.test.ts`: setting helper tests.
- Create `src/simulation/engine.ts`: pure simulation engine.
- Create `src/simulation/engine.test.ts`: simulation cause-and-effect tests.
- Create `src/simulation/scoring.ts`: score summary calculation.
- Create `src/simulation/scoring.test.ts`: scoring and practice-mode tests.
- Create `src/components/ControlPanel.tsx`: grouped operator controls.
- Create `src/components/MetricsStrip.tsx`: live setup metrics.
- Create `src/components/CoachPanel.tsx`: optional coaching and warnings.
- Create `src/components/PrintPreview.tsx`: SVG print sample renderer.
- Create `src/components/PrintPreview.test.tsx`: renderer-state tests.
- Create `src/components/ScoreModal.tsx`: finish-run score summary.
- Create `tests/e2e/simulator.spec.ts`: Playwright smoke flow.
- Create `playwright.config.ts`: browser test configuration.
- Create `vitest.config.ts`: unit test configuration.
- Create `tsconfig.json`, `tsconfig.node.json`: TypeScript configuration.
- Create `.gitignore`: exclude dependencies, build output, reports, and `.superpowers/`.

## Task 1: Scaffold The Web App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create toolchain files**

Create `package.json`:

```json
{
  "name": "flexographic-press-simulator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "jsdom": "^26.1.0",
    "vitest": "^3.1.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["@testing-library/jest-dom/vitest"],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 950 } },
    },
  ],
});
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.superpowers/
.DS_Store
```

- [ ] **Step 2: Create the minimal app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flexographic Press Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Wide-web flexographic setup</p>
        <h1>Flexographic Press Simulator</h1>
        <p>Adjust a virtual press and watch the print sample respond.</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #172027;
  background: #eef1f4;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 1024px;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.hero-panel {
  min-height: calc(100vh - 48px);
  border: 1px solid #cfd7df;
  background: #f8fafb;
  display: grid;
  place-content: center;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  color: #53616d;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 3rem;
  line-height: 1.05;
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Verify the shell builds**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete successfully, producing `dist/`.

- [ ] **Step 5: Commit**

Run when git is available:

```bash
git add .gitignore package.json package-lock.json index.html src/main.tsx src/App.tsx src/styles.css tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts playwright.config.ts
git commit -m "chore: scaffold flexographic simulator app"
```

Expected: commit records the app scaffold. If git remains unavailable, record the same permission error and continue without committing.

## Task 2: Define Domain Types And Starter Job

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/jobs.ts`
- Create: `src/domain/settings.ts`
- Create: `src/domain/settings.test.ts`

- [ ] **Step 1: Write failing settings tests**

Create `src/domain/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { starterJob } from "./jobs";
import { clampSetting, createInitialSettings, updateSetting } from "./settings";

describe("press setting helpers", () => {
  it("creates imperfect starter settings for the starter job", () => {
    const settings = createInitialSettings(starterJob);

    expect(settings.impression).toBe(67);
    expect(settings.pressSpeed).toBe(760);
    expect(settings.registration.cyanX).toBe(-1.4);
  });

  it("clamps numeric settings to their configured range", () => {
    expect(clampSetting(starterJob, "impression", 120)).toBe(100);
    expect(clampSetting(starterJob, "pressSpeed", 100)).toBe(300);
  });

  it("updates settings without mutating the original object", () => {
    const original = createInitialSettings(starterJob);
    const updated = updateSetting(starterJob, original, "inkViscosity", 42);

    expect(updated.inkViscosity).toBe(42);
    expect(original.inkViscosity).toBe(31);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- src/domain/settings.test.ts
```

Expected: FAIL because `src/domain/jobs.ts` and `src/domain/settings.ts` do not exist yet.

- [ ] **Step 3: Create domain types**

Create `src/domain/types.ts`:

```ts
export type SubstrateId = "pet-film" | "opp-film" | "paper-laminate";

export type PressSettingKey =
  | "aniloxVolume"
  | "aniloxLineScreen"
  | "inkViscosity"
  | "inkStrength"
  | "impression"
  | "webTension"
  | "dryerTemperature"
  | "pressSpeed";

export type RegistrationKey =
  | "cyanX"
  | "cyanY"
  | "magentaX"
  | "magentaY"
  | "yellowX"
  | "yellowY"
  | "blackX"
  | "blackY";

export type SettingRange = {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
};

export type Registration = Record<RegistrationKey, number>;

export type PressSettings = Record<PressSettingKey, number> & {
  substrate: SubstrateId;
  registration: Registration;
};

export type JobTarget = {
  density: number;
  gain: number;
  dryingCapacity: number;
  tension: number;
  speed: number;
  aniloxVolume: number;
  inkViscosity: number;
  impression: number;
};

export type JobPreset = {
  id: string;
  name: string;
  description: string;
  substrateOptions: SubstrateId[];
  ranges: Record<PressSettingKey, SettingRange>;
  initialSettings: PressSettings;
  target: JobTarget;
};

export type DefectSeverity = {
  pinholes: number;
  dirtyPrint: number;
  mottle: number;
  skips: number;
  edgeSquash: number;
};

export type SimulationOutcome = {
  density: number;
  gain: number;
  registerError: number;
  dryingRisk: number;
  wasteRate: number;
  setupQuality: number;
  defects: DefectSeverity;
  coaching: CoachingMessage[];
};

export type CoachingLevel = "info" | "warning" | "success";

export type CoachingMessage = {
  id: string;
  level: CoachingLevel;
  text: string;
};

export type ScoreSummary = {
  qualityScore: number;
  wasteScore: number;
  stabilityScore: number;
  totalScore: number;
  grade: "Needs work" | "Getting close" | "Press ready";
};
```

- [ ] **Step 4: Create starter job and settings helpers**

Create `src/domain/jobs.ts`:

```ts
import type { JobPreset } from "./types";

export const starterJob: JobPreset = {
  id: "snack-pouch-cmyk",
  name: "Snack Pouch Film",
  description: "Four-color process setup on PET film for a flexible packaging job.",
  substrateOptions: ["pet-film", "opp-film", "paper-laminate"],
  ranges: {
    aniloxVolume: { min: 1.8, max: 5.5, step: 0.1, unit: "BCM", label: "Anilox volume" },
    aniloxLineScreen: { min: 800, max: 1400, step: 50, unit: "lpi", label: "Anilox line screen" },
    inkViscosity: { min: 18, max: 45, step: 1, unit: "s", label: "Ink viscosity" },
    inkStrength: { min: 70, max: 120, step: 1, unit: "%", label: "Ink strength" },
    impression: { min: 0, max: 100, step: 1, unit: "%", label: "Impression" },
    webTension: { min: 20, max: 80, step: 1, unit: "pli", label: "Web tension" },
    dryerTemperature: { min: 80, max: 180, step: 5, unit: "F", label: "Dryer temperature" },
    pressSpeed: { min: 300, max: 1200, step: 10, unit: "fpm", label: "Press speed" },
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
    aniloxVolume: 4.1,
    aniloxLineScreen: 1000,
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

Create `src/domain/settings.ts`:

```ts
import type { JobPreset, PressSettingKey, PressSettings } from "./types";

export function createInitialSettings(job: JobPreset): PressSettings {
  return structuredClone(job.initialSettings);
}

export function clampSetting(
  job: JobPreset,
  key: PressSettingKey,
  value: number,
): number {
  const range = job.ranges[key];
  return Math.min(range.max, Math.max(range.min, value));
}

export function updateSetting(
  job: JobPreset,
  settings: PressSettings,
  key: PressSettingKey,
  value: number,
): PressSettings {
  return {
    ...settings,
    [key]: clampSetting(job, key, value),
  };
}
```

- [ ] **Step 5: Run domain tests**

Run:

```bash
npm test -- src/domain/settings.test.ts
```

Expected: PASS for all three setting helper tests.

- [ ] **Step 6: Commit**

Run when git is available:

```bash
git add src/domain/types.ts src/domain/jobs.ts src/domain/settings.ts src/domain/settings.test.ts
git commit -m "feat: define flexo job settings"
```

Expected: commit records starter job and setting helpers.

## Task 3: Build The Simulation Engine

**Files:**
- Create: `src/simulation/engine.ts`
- Create: `src/simulation/engine.test.ts`

- [ ] **Step 1: Write failing simulation tests**

Create `src/simulation/engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "./engine";

describe("simulatePress", () => {
  it("scores a near-target setup as press ready", () => {
    const outcome = simulatePress(starterJob, {
      ...starterJob.initialSettings,
      aniloxVolume: 3.2,
      inkViscosity: 28,
      inkStrength: 100,
      impression: 54,
      webTension: 50,
      dryerTemperature: 150,
      pressSpeed: 650,
      registration: {
        cyanX: 0,
        cyanY: 0,
        magentaX: 0,
        magentaY: 0,
        yellowX: 0,
        yellowY: 0,
        blackX: 0,
        blackY: 0,
      },
    });

    expect(outcome.setupQuality).toBeGreaterThanOrEqual(90);
    expect(outcome.defects.pinholes).toBeLessThan(10);
    expect(outcome.defects.dirtyPrint).toBeLessThan(10);
  });

  it("increases gain and dirty print with excessive impression", () => {
    const normal = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 54,
    });
    const excessive = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 92,
    });

    expect(excessive.gain).toBeGreaterThan(normal.gain);
    expect(excessive.defects.dirtyPrint).toBeGreaterThan(normal.defects.dirtyPrint);
  });

  it("lowers density and increases pinholes with insufficient impression", () => {
    const normal = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 54,
    });
    const light = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      impression: 18,
    });

    expect(light.density).toBeLessThan(normal.density);
    expect(light.defects.pinholes).toBeGreaterThan(normal.defects.pinholes);
  });

  it("raises drying risk when speed and ink load exceed drying capacity", () => {
    const controlled = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      pressSpeed: 520,
      aniloxVolume: 3,
      inkStrength: 96,
      dryerTemperature: 160,
    });
    const risky = simulatePress(starterJob, {
      ...createInitialSettings(starterJob),
      pressSpeed: 1150,
      aniloxVolume: 5.4,
      inkStrength: 118,
      dryerTemperature: 90,
    });

    expect(risky.dryingRisk).toBeGreaterThan(controlled.dryingRisk);
    expect(risky.coaching.some((message) => message.id === "drying-risk")).toBe(true);
  });

  it("reports registration error from color offsets", () => {
    const outcome = simulatePress(starterJob, createInitialSettings(starterJob));

    expect(outcome.registerError).toBeGreaterThan(1);
    expect(outcome.coaching.some((message) => message.id === "registration-offset")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- src/simulation/engine.test.ts
```

Expected: FAIL because `simulatePress` is not implemented.

- [ ] **Step 3: Implement the pure simulation engine**

Create `src/simulation/engine.ts`:

```ts
import type {
  CoachingMessage,
  DefectSeverity,
  JobPreset,
  PressSettings,
  Registration,
  SimulationOutcome,
} from "../domain/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scale(value: number, target: number, tolerance: number): number {
  return Math.abs(value - target) / tolerance;
}

function registrationMagnitude(registration: Registration): number {
  const values = Object.values(registration);
  const sum = values.reduce((total, value) => total + value * value, 0);
  return Math.sqrt(sum / values.length);
}

function toSeverity(value: number): number {
  return Math.round(clamp01(value) * 100);
}

export function simulatePress(job: JobPreset, settings: PressSettings): SimulationOutcome {
  const impressionHigh = clamp01((settings.impression - job.target.impression) / 42);
  const impressionLow = clamp01((job.target.impression - settings.impression) / 38);
  const aniloxLoad = settings.aniloxVolume / job.target.aniloxVolume;
  const viscosityLoad = settings.inkViscosity / job.target.inkViscosity;
  const inkStrengthLoad = settings.inkStrength / 100;
  const speedLoad = settings.pressSpeed / job.target.speed;
  const dryerCapacity = clamp01((settings.dryerTemperature - 80) / 100);
  const tensionError = scale(settings.webTension, job.target.tension, 34);
  const registerError = registrationMagnitude(settings.registration);

  const density = Math.max(
    0.35,
    1 * aniloxLoad * inkStrengthLoad * (1 - impressionLow * 0.42) + impressionHigh * 0.08,
  );
  const gain = Math.max(0.05, job.target.gain + impressionHigh * 0.34 + viscosityLoad * 0.03);
  const dryingDemand = clamp01((aniloxLoad * inkStrengthLoad * speedLoad) / 1.8);
  const dryingRisk = clamp01(dryingDemand - dryerCapacity * job.target.dryingCapacity);

  const defects: DefectSeverity = {
    pinholes: toSeverity(impressionLow * 0.9 + scale(settings.aniloxVolume, 2.4, 3.2) * 0.12),
    dirtyPrint: toSeverity(impressionHigh * 0.82 + viscosityLoad * 0.08),
    mottle: toSeverity(scale(settings.inkViscosity, job.target.inkViscosity, 18) * 0.55 + dryingRisk * 0.28),
    skips: toSeverity(impressionLow * 0.7 + tensionError * 0.3),
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
    density: Number(density.toFixed(2)),
    gain: Number(gain.toFixed(2)),
    registerError: Number(registerError.toFixed(2)),
    dryingRisk: Math.round(dryingRisk * 100),
    wasteRate,
    setupQuality,
    defects,
    coaching,
  };
}
```

- [ ] **Step 4: Run simulation tests**

Run:

```bash
npm test -- src/simulation/engine.test.ts
```

Expected: PASS for all simulation tests. If a numeric threshold is slightly off, adjust only constants in `src/simulation/engine.ts` while preserving the tested cause-and-effect direction.

- [ ] **Step 5: Commit**

Run when git is available:

```bash
git add src/simulation/engine.ts src/simulation/engine.test.ts
git commit -m "feat: add rule-based press simulation"
```

Expected: commit records the simulation engine.

## Task 4: Add Scoring And Practice-Mode Coaching

**Files:**
- Create: `src/simulation/scoring.ts`
- Create: `src/simulation/scoring.test.ts`

- [ ] **Step 1: Write failing scoring tests**

Create `src/simulation/scoring.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- src/simulation/scoring.test.ts
```

Expected: FAIL because scoring functions do not exist.

- [ ] **Step 3: Implement scoring**

Create `src/simulation/scoring.ts`:

```ts
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
```

- [ ] **Step 4: Run scoring tests**

Run:

```bash
npm test -- src/simulation/scoring.test.ts
```

Expected: PASS for scoring and practice-mode filtering.

- [ ] **Step 5: Commit**

Run when git is available:

```bash
git add src/simulation/scoring.ts src/simulation/scoring.test.ts
git commit -m "feat: add setup scoring"
```

Expected: commit records score calculation and coaching filtering.

## Task 5: Build The Print Preview Renderer

**Files:**
- Create: `src/components/PrintPreview.tsx`
- Create: `src/components/PrintPreview.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Create `src/components/PrintPreview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { simulatePress } from "../simulation/engine";
import { PrintPreview } from "./PrintPreview";

describe("PrintPreview", () => {
  it("renders a live print sample with defect overlays", () => {
    const settings = createInitialSettings(starterJob);
    const outcome = simulatePress(starterJob, settings);

    render(<PrintPreview settings={settings} outcome={outcome} />);

    expect(screen.getByLabelText("Live print sample")).toBeInTheDocument();
    expect(screen.getByTestId("cyan-layer")).toHaveAttribute("transform");
    expect(screen.getByTestId("pinholes")).toHaveAttribute(
      "opacity",
      String(outcome.defects.pinholes / 100),
    );
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- src/components/PrintPreview.test.tsx
```

Expected: FAIL because `PrintPreview` does not exist.

- [ ] **Step 3: Implement SVG print preview**

Create `src/components/PrintPreview.tsx`:

```tsx
import type { PressSettings, SimulationOutcome } from "../domain/types";

type PrintPreviewProps = {
  settings: PressSettings;
  outcome: SimulationOutcome;
};

function shift(value: number): number {
  return value * 4;
}

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const densityOpacity = Math.min(1, Math.max(0.35, outcome.density));
  const gainScale = 1 + outcome.gain * 0.45;

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <svg viewBox="0 0 920 420" role="img" aria-label="Simulated flexible packaging web">
        <rect width="920" height="420" rx="18" fill="#f6f1e8" />
        <rect x="26" y="28" width="868" height="364" rx="10" fill="#fffdf8" />
        <g opacity={densityOpacity}>
          <g data-testid="cyan-layer" transform={`translate(${shift(settings.registration.cyanX)} ${shift(settings.registration.cyanY)})`}>
            <rect x="70" y="70" width="260" height="112" fill="#0088b8" />
            <circle cx="660" cy="150" r={72 * gainScale} fill="#00a7c8" opacity="0.82" />
          </g>
          <g data-testid="magenta-layer" transform={`translate(${shift(settings.registration.magentaX)} ${shift(settings.registration.magentaY)})`}>
            <rect x="132" y="106" width="250" height="112" fill="#c83564" opacity="0.85" />
            <circle cx="704" cy="190" r={58 * gainScale} fill="#d3266c" opacity="0.78" />
          </g>
          <g data-testid="yellow-layer" transform={`translate(${shift(settings.registration.yellowX)} ${shift(settings.registration.yellowY)})`}>
            <rect x="92" y="206" width="330" height="86" fill="#f2c53d" opacity="0.88" />
            <circle cx="618" cy="222" r={64 * gainScale} fill="#ffd84d" opacity="0.82" />
          </g>
          <g data-testid="black-layer" transform={`translate(${shift(settings.registration.blackX)} ${shift(settings.registration.blackY)})`}>
            <text x="78" y="342" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800" fill="#202124">
              CRISP FLEXO
            </text>
            <path d="M508 78h270M508 112h208M508 146h238M508 322h285" stroke="#202124" strokeWidth={6 * gainScale} strokeLinecap="round" />
            <g fill="none" stroke="#202124" strokeWidth="3">
              <circle cx="820" cy="76" r="18" />
              <line x1="802" y1="76" x2="838" y2="76" />
              <line x1="820" y1="58" x2="820" y2="94" />
            </g>
          </g>
        </g>
        <g data-testid="pinholes" opacity={String(outcome.defects.pinholes / 100)}>
          {Array.from({ length: 18 }).map((_, index) => (
            <circle
              key={index}
              cx={120 + ((index * 43) % 690)}
              cy={82 + ((index * 67) % 246)}
              r={3 + (index % 3)}
              fill="#fffdf8"
            />
          ))}
        </g>
        <g opacity={outcome.defects.dirtyPrint / 100}>
          <rect x="46" y="48" width="832" height="324" fill="#292521" opacity="0.12" />
          <path d="M80 58c180 48 420-18 762 34" stroke="#342a20" strokeWidth="18" opacity="0.2" fill="none" />
        </g>
        <g opacity={outcome.defects.edgeSquash / 100}>
          <rect x="62" y="62" width="320" height="170" fill="none" stroke="#1c1a18" strokeWidth="18" opacity="0.22" />
        </g>
      </svg>
    </section>
  );
}
```

- [ ] **Step 4: Run renderer tests**

Run:

```bash
npm test -- src/components/PrintPreview.test.tsx
```

Expected: PASS for renderer tests.

- [ ] **Step 5: Commit**

Run when git is available:

```bash
git add src/components/PrintPreview.tsx src/components/PrintPreview.test.tsx
git commit -m "feat: render live print sample"
```

Expected: commit records SVG print renderer.

## Task 6: Build Controls, Metrics, Coaching, And Score Modal

**Files:**
- Create: `src/components/ControlPanel.tsx`
- Create: `src/components/MetricsStrip.tsx`
- Create: `src/components/CoachPanel.tsx`
- Create: `src/components/ScoreModal.tsx`

- [ ] **Step 1: Implement control panel component**

Create `src/components/ControlPanel.tsx`:

```tsx
import type { JobPreset, PressSettingKey, PressSettings, RegistrationKey } from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onRegistrationChange: (key: RegistrationKey, value: number) => void;
};

const settingOrder: PressSettingKey[] = [
  "aniloxVolume",
  "aniloxLineScreen",
  "inkViscosity",
  "inkStrength",
  "impression",
  "webTension",
  "dryerTemperature",
  "pressSpeed",
];

const registrationOrder: RegistrationKey[] = [
  "cyanX",
  "cyanY",
  "magentaX",
  "magentaY",
  "yellowX",
  "yellowY",
  "blackX",
  "blackY",
];

export function ControlPanel({
  job,
  settings,
  onSettingChange,
  onRegistrationChange,
}: ControlPanelProps) {
  return (
    <aside className="control-panel" aria-label="Press setup controls">
      <div>
        <p className="panel-label">Job</p>
        <h2>{job.name}</h2>
        <p>{job.description}</p>
      </div>
      <div className="control-group">
        <h3>Press settings</h3>
        {settingOrder.map((key) => {
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
                onChange={(event) => onSettingChange(key, Number(event.target.value))}
              />
            </label>
          );
        })}
      </div>
      <div className="control-group">
        <h3>Registration</h3>
        {registrationOrder.map((key) => (
          <label className="control" key={key}>
            <span>
              {key}
              <strong>{settings.registration[key].toFixed(1)} mil</strong>
            </span>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.registration[key]}
              onChange={(event) => onRegistrationChange(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Implement metrics, coaching, and score components**

Create `src/components/MetricsStrip.tsx`:

```tsx
import type { SimulationOutcome } from "../domain/types";

type MetricsStripProps = {
  outcome: SimulationOutcome;
};

export function MetricsStrip({ outcome }: MetricsStripProps) {
  const metrics = [
    ["Setup quality", `${outcome.setupQuality}%`],
    ["Waste", `${outcome.wasteRate} ft`],
    ["Density", outcome.density.toFixed(2)],
    ["Gain", `${Math.round(outcome.gain * 100)}%`],
    ["Drying risk", `${outcome.dryingRisk}%`],
    ["Register", `${outcome.registerError.toFixed(2)} mil`],
  ];

  return (
    <section className="metrics-strip" aria-label="Live press metrics">
      {metrics.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
```

Create `src/components/CoachPanel.tsx`:

```tsx
import type { CoachingMessage } from "../domain/types";

type CoachPanelProps = {
  messages: CoachingMessage[];
  mode: "guided" | "practice";
  onModeChange: (mode: "guided" | "practice") => void;
};

export function CoachPanel({ messages, mode, onModeChange }: CoachPanelProps) {
  return (
    <section className="coach-panel" aria-label="Coaching">
      <div className="coach-panel__header">
        <div>
          <p className="panel-label">Coaching</p>
          <h2>{mode === "guided" ? "Guided setup" : "Practice mode"}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onModeChange(mode === "guided" ? "practice" : "guided")}
        >
          {mode === "guided" ? "Practice" : "Show hints"}
        </button>
      </div>
      {messages.length === 0 ? (
        <p className="quiet-copy">
          {mode === "practice"
            ? "Hints are hidden. Metrics and print behavior still update."
            : "No active warnings. Keep tuning toward the target window."}
        </p>
      ) : (
        <ul className="coaching-list">
          {messages.map((message) => (
            <li className={`coaching-message coaching-message--${message.level}`} key={message.id}>
              {message.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Create `src/components/ScoreModal.tsx`:

```tsx
import type { ScoreSummary } from "../domain/types";

type ScoreModalProps = {
  score: ScoreSummary | null;
  onClose: () => void;
  onReset: () => void;
};

export function ScoreModal({ score, onClose, onReset }: ScoreModalProps) {
  if (!score) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
        <p className="panel-label">Run summary</p>
        <h2 id="score-title">Run summary: {score.grade}</h2>
        <div className="score-total">{score.totalScore}</div>
        <div className="score-grid">
          <span>Quality</span>
          <strong>{score.qualityScore}</strong>
          <span>Waste</span>
          <strong>{score.wasteScore}</strong>
          <span>Stability</span>
          <strong>{score.stabilityScore}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Continue tuning
          </button>
          <button type="button" className="primary-button" onClick={onReset}>
            Reset job
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Run TypeScript build**

Run:

```bash
npm run build
```

Expected: PASS. The components are not yet imported by the app, but TypeScript still checks the files under `src`.

- [ ] **Step 4: Commit**

Run when git is available:

```bash
git add src/components/ControlPanel.tsx src/components/MetricsStrip.tsx src/components/CoachPanel.tsx src/components/ScoreModal.tsx
git commit -m "feat: add simulator control components"
```

Expected: commit records training UI components.

## Task 7: Wire The Simulator App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing app interaction tests**

Create `src/App.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("updates metrics when the learner changes impression", async () => {
    const user = userEvent.setup();
    render(<App />);

    const qualityBefore = screen.getByText("Setup quality").nextElementSibling?.textContent;
    const impression = screen.getByLabelText(/Impression/i);
    fireEvent.change(impression, { target: { value: "92" } });

    expect(screen.getByText("Setup quality").nextElementSibling?.textContent).not.toBe(qualityBefore);
  });

  it("toggles coaching into practice mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Practice" }));

    expect(screen.getByText("Practice mode")).toBeInTheDocument();
    expect(screen.getByText(/Hints are hidden/i)).toBeInTheDocument();
  });

  it("shows a score summary when the learner finishes the run", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Finish run" }));

    expect(screen.getByRole("dialog", { name: /Run summary/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because `App` still renders the minimal shell.

- [ ] **Step 3: Replace the shell with the simulator**

Modify `src/App.tsx`:

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

  function handleRegistrationChange(key: RegistrationKey, value: number) {
    setSettings((current) => ({
      ...current,
      registration: {
        ...current.registration,
        [key]: value,
      },
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
          onRegistrationChange={handleRegistrationChange}
        />
      </div>
      <ScoreModal score={score} onClose={() => setScore(null)} onReset={resetJob} />
    </main>
  );
}
```

- [ ] **Step 4: Add full simulator styling**

Replace `src/styles.css` with:

```css
:root {
  color: #18212a;
  background: #e8edf1;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 1120px;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  min-height: 100vh;
  padding: 22px;
}

.app-header,
.metrics-strip,
.print-preview,
.coach-panel,
.control-panel,
.score-modal {
  border: 1px solid #cbd5dd;
  background: #fbfcfd;
  border-radius: 8px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 18px 20px;
}

.eyebrow,
.panel-label {
  margin: 0 0 6px;
  color: #697784;
  text-transform: uppercase;
  font-size: 0.75rem;
  font-weight: 800;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-size: 2rem;
}

h2 {
  font-size: 1.05rem;
}

h3 {
  font-size: 0.88rem;
}

.header-actions,
.modal-actions {
  display: flex;
  gap: 10px;
}

.primary-button,
.secondary-button {
  min-height: 40px;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 0 14px;
  font-weight: 800;
}

.primary-button {
  background: #0f6b78;
  color: #fff;
}

.secondary-button {
  background: #eef3f6;
  color: #23313b;
  border-color: #cbd5dd;
}

.metrics-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  margin: 14px 0;
  overflow: hidden;
}

.metric {
  background: #fff;
  padding: 12px 14px;
}

.metric span {
  display: block;
  color: #697784;
  font-size: 0.78rem;
  font-weight: 700;
}

.metric strong {
  display: block;
  margin-top: 5px;
  font-size: 1.2rem;
}

.simulator-grid {
  display: grid;
  grid-template-columns: minmax(680px, 1fr) 380px;
  gap: 14px;
  align-items: start;
}

.print-workspace {
  display: grid;
  gap: 14px;
}

.print-preview {
  padding: 16px;
}

.print-preview__header,
.coach-panel__header,
.control span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.print-preview svg {
  display: block;
  width: 100%;
  min-height: 390px;
}

.coach-panel,
.control-panel {
  padding: 16px;
}

.coach-panel__header {
  margin-bottom: 12px;
}

.quiet-copy {
  color: #5e6b76;
  margin-bottom: 0;
}

.coaching-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.coaching-message {
  border-radius: 6px;
  padding: 10px 12px;
  border: 1px solid #d9d0b4;
  background: #fff7dc;
}

.coaching-message--success {
  border-color: #b7d7c1;
  background: #e9f8ee;
}

.control-panel {
  max-height: calc(100vh - 150px);
  overflow: auto;
}

.control-group {
  border-top: 1px solid #d9e0e6;
  padding-top: 14px;
  margin-top: 14px;
}

.control {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.control strong {
  white-space: nowrap;
}

.control input {
  width: 100%;
  accent-color: #0f6b78;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(16, 27, 34, 0.55);
  padding: 24px;
}

.score-modal {
  width: min(440px, 100%);
  padding: 24px;
}

.score-total {
  font-size: 4rem;
  line-height: 1;
  font-weight: 900;
  margin: 16px 0;
  color: #0f6b78;
}

.score-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-bottom: 22px;
}
```

- [ ] **Step 5: Run app tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run full unit suite**

Run:

```bash
npm test
```

Expected: PASS for domain, simulation, renderer, scoring, and app tests.

- [ ] **Step 7: Commit**

Run when git is available:

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: wire simulator training interface"
```

Expected: commit records the working simulator UI.

## Task 8: Add Browser Smoke Test And Visual Verification

**Files:**
- Create: `tests/e2e/simulator.spec.ts`
- Modify: `src/App.test.tsx` if needed for accessible names discovered during e2e testing.

- [ ] **Step 1: Write Playwright smoke test**

Create `tests/e2e/simulator.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("operator can adjust settings, switch to practice, and finish a run", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Flexographic Press Simulator" })).toBeVisible();
  await expect(page.getByLabel("Live print sample")).toBeVisible();

  const initialQuality = await page.getByText("Setup quality").locator("..").locator("strong").textContent();
  await page.getByLabel(/Impression/i).evaluate((input) => {
    const element = input as HTMLInputElement;
    element.value = "92";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const changedQuality = await page.getByText("Setup quality").locator("..").locator("strong").textContent();
  expect(changedQuality).not.toBe(initialQuality);

  await page.getByRole("button", { name: "Practice" }).click();
  await expect(page.getByText("Practice mode")).toBeVisible();

  await page.getByRole("button", { name: "Finish run" }).click();
  await expect(page.getByRole("dialog", { name: /Run summary/i })).toBeVisible();
});
```

- [ ] **Step 2: Install Playwright browsers**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium browser binary is available for Playwright.

- [ ] **Step 3: Run browser test**

Run:

```bash
npm run e2e
```

Expected: PASS for the simulator smoke flow.

- [ ] **Step 4: Manually inspect at desktop size**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

Open the URL in the in-app browser and verify:

- The print sample is the visual center of the app.
- Controls are readable without horizontal scrolling at 1440px width.
- Metrics update when sliders move.
- Coaching hides in practice mode.
- Finish run opens a score summary.
- Text does not overlap at desktop sizes.

- [ ] **Step 5: Commit**

Run when git is available:

```bash
git add tests/e2e/simulator.spec.ts src/App.test.tsx
git commit -m "test: add simulator browser smoke flow"
```

Expected: commit records browser verification coverage.

## Task 9: Final Verification And Handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:

````md
# Flexographic Press Simulator

A desktop web simulator for wide-web flexible packaging operators practicing basic flexographic press setup.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
npm run e2e
```

## Version 1 Scope

- Print-first sandbox interface.
- Wide-web flexible packaging starter job.
- Rule-based setup simulation.
- Live print sample, metrics, coaching, practice mode, reset, and run scoring.
````

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected: all commands pass.

- [ ] **Step 3: Check workspace status**

Run:

```bash
git status --short
```

Expected when git is available: no uncommitted changes except intentional local artifacts. If git remains unavailable, record `fatal: not a git repository` in the final handoff.

- [ ] **Step 4: Commit README**

Run when git is available:

```bash
git add README.md
git commit -m "docs: add simulator run instructions"
```

Expected: commit records project instructions.

## Self-Review Notes

- Spec coverage: The plan covers the desktop app, print-first sandbox, starter job, controls, live print sample, metrics, scoring, coaching, practice mode, reset, and finish-run summary.
- Architecture coverage: The plan preserves the three intended layers: domain/simulation, print renderer, and training UI.
- Testing coverage: Simulation behavior is tested first, then scoring, renderer behavior, app interactions, and a browser smoke flow.
- Known blocker: Git commit steps depend on fixing the current `.git` creation permission issue.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-flexographic-press-simulator.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.
