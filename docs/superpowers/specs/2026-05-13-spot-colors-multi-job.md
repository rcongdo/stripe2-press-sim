# Spot Colors & Multi-Job Support Design

## Goal

Extend the flexographic press simulator to support up to 10 ink channels per job (4 process + up to 6 spot colors) and a job selector UI, using a unified channel architecture that makes adding future jobs straightforward.

## Architecture

All channels — process (CMYK) and spot — are defined as `ChannelDef` entries on the job preset. There is no separate spot-channel code path. The engine, settings, rendering, and UI all iterate over whatever channels the active job defines. Spot channels start inactive; the learner adds them during setup.

## Tech Stack

React 19, TypeScript, Vite, Canvas 2D (existing stack). No new dependencies.

---

## 1. Type System (`src/domain/types.ts`)

### New types

```ts
type ChannelId = string; // "C", "M", "Y", "K", "orange", "silver", "white"

type ArtworkZone =
  | { type: "rect";    x: number; y: number; w: number; h: number }
  | { type: "polygon"; points: [number, number][] };

type ChannelDef = {
  id: ChannelId;
  name: string;           // "Cyan", "Pantone 021 Orange", etc.
  isProcess: boolean;     // true = full artwork CMYK separation; false = zone fill only
  displayColor: string;   // hex used for UI swatch and canvas ink color
  screenAngle: number;    // halftone screen angle in degrees
  artworkZones: ArtworkZone[]; // empty for process channels; spot zones in canvas px at SCALE
  initiallyActive: boolean;    // true for all process channels; false for spot channels
  targetDensity: number;       // target optical density for this channel
};

type RegistrationOffset = { x: number; y: number };
```

### Removed types

- `InkChannelKey` (`"C" | "M" | "Y" | "K"`) — replaced by `ChannelId` (string)
- `RegistrationKey` (`"cyanX" | "cyanY" | …`) — replaced by `Record<ChannelId, RegistrationOffset>`

### Changed types

| Type | Before | After |
|---|---|---|
| `PressSettings.inkChannels` | `Record<InkChannelKey, InkChannelSettings>` | `Record<ChannelId, InkChannelSettings>` (only active channels present) |
| `PressSettings.registration` | `Record<RegistrationKey, number>` | `Record<ChannelId, RegistrationOffset>` |
| `SimulationOutcome.channelDensity` | `Record<InkChannelKey, number>` | `Record<ChannelId, number>` |
| `SimulationOutcome.channelGain` | `Record<InkChannelKey, number>` | `Record<ChannelId, number>` |
| `JobTarget.channelTargetDensity` | `Record<InkChannelKey, number>` | removed (moved to `ChannelDef.targetDensity`) |
| `JobPreset` | no `channels` field | gains `channels: ChannelDef[]` |

---

## 2. Job Definition & Registry (`src/domain/jobs.ts`)

### Job registry

```ts
export const JOB_REGISTRY: readonly JobPreset[] = [snackPouchJob, labelPrintJob];
```

`App.tsx` imports `JOB_REGISTRY` and holds the selected job in state. `starterJob` export is kept as an alias of `snackPouchJob` for backward compatibility with tests.

### Snack Pouch Film channels

Seven channels total (4 process + 3 spot):

| id | name | isProcess | initiallyActive | targetDensity | screenAngle |
|---|---|---|---|---|---|
| `C` | Cyan | true | true | 1.4 | 15° |
| `M` | Magenta | true | true | 1.4 | 75° |
| `Y` | Yellow | true | true | 1.0 | 0° |
| `K` | Black | true | true | 1.6 | 45° |
| `orange` | Pantone 021 Orange | false | false | 1.5 | 30° |
| `silver` | Metallic Silver | false | false | 1.2 | 60° |
| `white` | Opaque White | false | false | 0.9 | 22° |

Spot channel `artworkZones` use canvas-pixel coordinates at native `SCALE`, relative to the pouch top-left origin. Exact values are determined during implementation by measuring against the existing zone layout in `PrintPreview.tsx`:
- **orange**: horizontal flavor band rect (existing flavor zone area)
- **silver**: border frame rect(s) around the pouch perimeter
- **white**: full backing rect (same footprint as the pouch, prints first)

`displayColor` values: orange `#ff6a00`, silver `#a8b4be`, white `#f0f0f0` (slightly off-white so it's visible on the canvas).

### Label Print job (`labelPrintJob`)

A minimal second job to prove the job selector works:
- CMYK process channels only (no spot channels)
- Different press ranges and targets (tighter speed, lower anilox)
- Placeholder artwork renderer (solid colored rect with job name text)
- Same `ChannelDef` structure as snack pouch

### `initialSettings`

Derived from `job.channels.filter(ch => ch.initiallyActive)`. Spot channel settings are not present in `initialSettings`; they are added to `PressSettings` when the learner activates the channel.

---

## 3. Settings Layer (`src/domain/settings.ts`)

### Changed functions

**`createInitialSettings(job)`**: loops over `job.channels.filter(ch => ch.initiallyActive)` to build `inkChannels` and `registration` records dynamically instead of hardcoding CMYK keys.

**`createPerfectSettings(job)`**: same — iterates initially-active channels.

**`updateInkChannelSetting`**: signature changes `channel: InkChannelKey` → `channel: ChannelId`. Logic unchanged.

### New functions

```ts
// Adds a spot channel to active settings with defaults from the channel def
activateSpotChannel(job: JobPreset, settings: PressSettings, channelId: ChannelId): PressSettings

// Removes a spot channel from active settings
deactivateSpotChannel(settings: PressSettings, channelId: ChannelId): PressSettings
```

`activateSpotChannel` initializes `inkChannels[channelId]` with sensible defaults (target anilox, target viscosity, 100% strength, target impression from job) and `registration[channelId]` at `{ x: 0, y: 0 }`.

---

## 4. Simulation Engine (`src/simulation/engine.ts`)

The engine derives its channel list at runtime:

```ts
const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);
```

Then loops over `activeChannels` for density, gain, and defect calculations. The math is identical to today; only the iteration source changes.

**Registration lookup** changes from `settings.registration.cyanX` / `settings.registration.cyanY` to `settings.registration[ch.id].x` / `.y`.

**`channelDensityError`** includes all active channels (spot channels are penalized for missing their `targetDensity` just like CMYK).

**Drying risk** accumulates across all active channels — adding spot channels to a fast run genuinely increases drying demand.

**`simulatePress` signature** is unchanged: `(job: JobPreset, settings: PressSettings) => SimulationOutcome`.

---

## 5. PrintPreview Rendering (`src/components/PrintPreview.tsx`)

### Render order

Active channels are sorted before rendering: white-backing spots first (so they print under everything), then process CMYK in Y→M→C→K order, then remaining spots on top.

```ts
const sortedChannels = [
  ...activeChannels.filter(ch => ch.id === "white"),
  ...activeChannels.filter(ch => ch.isProcess),
  ...activeChannels.filter(ch => !ch.isProcess && ch.id !== "white"),
];
```

### Process channel rendering (unchanged logic)

`drawArtworkForChannel` and `drawPlate` continue to draw the full artwork using CMYK separation math. Registration offset: `settings.registration[ch.id].x/y` replaces the old `REG_KEYS` map.

### Spot channel rendering (new)

A new `drawSpotChannel(ctx, ch, pouchX, regX, regY, ...)` function:
- Clips to each `ch.artworkZones` shape
- Solid view: fills zones with `ch.displayColor` at density-derived alpha
- Halftone view: calls `dotsInRect` / `dotsInPath` within each zone at `ch.screenAngle`
- Applies `destination-out` text knockout (same as process channels)
- Composited with `multiply` onto main via OffscreenCanvas (same pipeline as process channels)

### Multi-job artwork dispatch

`PrintPreview` switches on `job.id` to call the correct artwork renderer:

```ts
function renderArtwork(ctx, job, ch, pouchX, regX, regY, settings, outcome) {
  if (job.id === "snack-pouch-cmyk") return renderSnackPouch(ctx, ch, pouchX, regX, regY, settings, outcome);
  if (job.id === "label-print")      return renderLabelPrint(ctx, ch, pouchX, regX, regY, settings, outcome);
}
```

The snack pouch renderer is the existing code. The label print renderer is a placeholder colored rect.

### Removed

`REG_KEYS` constant (the `{ cyan: { x: "cyanX", y: "cyanY" }, … }` map) — deleted. All registration lookups use `settings.registration[ch.id]`.

---

## 6. MetricsStrip (`src/components/MetricsStrip.tsx`)

The channel density/SCTV table iterates `Object.entries(outcome.channelDensity)` instead of the hardcoded `["C","M","Y","K"]` array. Channel swatch color comes from `job.channels.find(ch => ch.id === key)?.displayColor`. The table grows naturally as spot channels are activated — no layout change needed.

`MetricsStrip` receives `job: JobPreset` as a new prop (needed to look up `displayColor` per channel).

---

## 7. ControlPanel (`src/components/ControlPanel.tsx`)

### Color selector

Replaces the hardcoded 4-button `colorOrder` array with a dynamic list from `job.channels`:

- **Active channels** (process or activated spot): full color button with swatch, selectable for sliders/dpad. Spot channels also show an "×" remove button.
- **Inactive spot channels**: a muted "+ {name}" add button. Clicking fires `onSpotChannelToggle(channelId, true)`.

### Sliders & dpad

Work identically once a channel is selected. Registration lookup uses `settings.registration[selectedChannelId].x/y` directly — no `colorKeys` map.

### New prop

```ts
onSpotChannelToggle: (channelId: ChannelId, active: boolean) => void;
```

### Removed

`colorKeys`, `colorOrder`, `colorSwatches`, `inkChannelMap` constants — replaced by data from `job.channels`.

---

## 8. App (`src/App.tsx`)

### Job selector

```tsx
<select value={selectedJob.id} onChange={e => switchJob(JOB_REGISTRY.find(j => j.id === e.target.value)!)}>
  {JOB_REGISTRY.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
</select>
```

Placed in the header to the left of the existing action buttons.

### State changes

```ts
const [selectedJob, setSelectedJob] = useState<JobPreset>(snackPouchJob);
const [settings, setSettings] = useState(() => createInitialSettings(snackPouchJob));
```

`switchJob(newJob)` resets settings to `createInitialSettings(newJob)`, clears score, and resets any selected color to the first process channel.

### New handler

```ts
function handleSpotChannelToggle(channelId: ChannelId, active: boolean) {
  setSettings(current =>
    active
      ? activateSpotChannel(selectedJob, current, channelId)
      : deactivateSpotChannel(current, channelId)
  );
}
```

`selectedJob` is passed down to `ControlPanel`, `MetricsStrip`, and `PrintPreview` in place of the hardcoded `starterJob`.

---

## Files Changed

| File | Change |
|---|---|
| `src/domain/types.ts` | Major refactor — new `ChannelDef`, `ArtworkZone`, `RegistrationOffset`; remove `InkChannelKey`, `RegistrationKey` |
| `src/domain/jobs.ts` | Add `ChannelDef` arrays to snack pouch; add `labelPrintJob`; export `JOB_REGISTRY` |
| `src/domain/settings.ts` | Dynamic channel loops; add `activateSpotChannel`, `deactivateSpotChannel` |
| `src/simulation/engine.ts` | Dynamic `activeChannels` loop; registration lookup via `ch.id` |
| `src/components/PrintPreview.tsx` | Dynamic channel loop; spot render path; multi-job dispatch; remove `REG_KEYS` |
| `src/components/MetricsStrip.tsx` | Dynamic channel table; add `job` prop |
| `src/components/ControlPanel.tsx` | Dynamic channel list; spot add/remove UI; add `onSpotChannelToggle` prop |
| `src/App.tsx` | Job selector; `selectedJob` state; `handleSpotChannelToggle` |
| `src/components/ControlPanel.test.tsx` | Update fixtures for new prop signatures |
| `src/domain/settings.test.ts` | Update for new settings shape |
| `src/simulation/engine.test.ts` | Update for dynamic channel structure |

---

## Out of Scope

- Spot color overprint vs. knockout toggle (all spots overprint via multiply for now)
- Trapping settings
- More than one additional job beyond `labelPrintJob`
- Pantone color library integration (colors are hardcoded on the job def)
