# Press Model Design

## Goal

Add an interactive, reactive model of the Wide-Web Central Impression (CI) flexographic press to the simulator, accessible as a tab alongside the existing Printed Output view. The model has two modes — Operate (live reactive feedback) and Learn (labeled educational view) — and two sub-views: an SVG full-press overview and a Canvas single-station detail.

## Architecture

### Component Tree

```
App
└── PrintWorkspace (new wrapper replaces print-workspace div)
      ├── TabBar — "Printed Output" | "Press Model"
      ├── PrintPreview (existing, shown on Printed Output tab)
      ├── PressModel (new, shown on Press Model tab)
      │     ├── ModeToggle — "Operate" | "Learn"
      │     ├── PressOverview (SVG) — default sub-view
      │     └── StationDetail (Canvas) — shown when a station is clicked
      └── CoachPanel (existing, below both tabs, always visible)
```

### New Files

- `src/components/PressModel.tsx` — container; owns `mode` (`operate` | `learn`) and `view` (`overview` | `{ station: ChannelId }`) state; routes to PressOverview or StationDetail
- `src/components/press/PressOverview.tsx` — SVG full-press schematic
- `src/components/press/StationDetail.tsx` — Canvas single-station detail with rAF animation loop
- `src/components/press/pressEducation.ts` — component name + description strings for Learn mode

### Props

```ts
// PressModel
{ job: JobPreset; settings: PressSettings; outcome: SimulationOutcome; selectedChannelId: ChannelId }

// PressOverview
{ job, settings, outcome, mode, selectedChannelId, onStationClick: (id: ChannelId) => void }

// StationDetail
{ job, settings, outcome, mode, channelId: ChannelId, onBack: () => void }
```

### Data Flow

`App` adds `activeTab: "output" | "press"` state. `selectedChannelId` (already `effectiveId` in `ControlPanel`) is lifted to `App` and passed to both `ControlPanel` and `PressModel` so the two panels stay in sync — selecting Magenta in the ControlPanel highlights the M station in the overview and pre-selects it in the detail view.

## SVG Overview (`PressOverview.tsx`)

### Layout

A Wide-Web CI press schematic: a large central impression drum dominates the center of the SVG. Print stations are arranged radially around the drum, one per active channel in `settings.inkChannels`, ordered by `job.channels`. The web enters from an unwind stand on the left, wraps around the CI drum (shown as a curved band conforming to the drum circumference), contacts each station in sequence, then exits to a rewind stand on the right.

Each print deck is a small SVG `<g>` positioned tangent to the drum, containing a simplified anilox roll and plate cylinder symbol. Station color comes from `ch.displayColor`. No per-station impression cylinder — the CI drum is the shared impression surface for all stations.

### Reactive States (Operate mode)

- **Station health ring**: a colored arc around each station group. Green when channel density is within ±10% of `ch.targetDensity`, amber within ±25%, red beyond.
- **Web path**: the curved band's visual tension reacts to `settings.webTension` — low tension produces a slight droop in the web between unwind and the drum; high tension pulls it taut.
- **Dryer units**: shown between stations and after the last station; fill color shifts cool blue → amber → red as `outcome.dryingRisk` climbs.
- **Registration offset arrows**: a small directional arrow on each station indicates the channel's x/y offset from `settings.registration`. Invisible when within ±0.5 mil on both axes.

### Learn Mode

A toggle button switches to Learn mode. In this mode, permanent labels appear beside each SVG component group (CI drum, anilox, plate cylinder, web, dryer, unwind, rewind). Clicking any label opens an inline tooltip showing the component's name and description from `pressEducation.ts`. Clicking elsewhere or pressing Escape closes it.

### Interaction

Clicking a station `<g>` fires `onStationClick(channelId)` and switches to StationDetail. The station matching `selectedChannelId` (from ControlPanel) receives a subtle highlight ring to keep the two panels visually in sync.

## Canvas Station Detail (`StationDetail.tsx`)

### Layout

A canvas panel using the same `SCALE=4` high-DPI approach as `PrintPreview`. Shows one print station in cross-section:

```
[ Chambered ink system (doctor blade + containment blade + ink chamber) ]
                        ↕
                  [ Anilox roll ]
                        ↕
                 [ Plate cylinder ]
                        ↕
         [ Web running through the nip ]
                        ↕
            [ CI drum surface (large arc) ]
```

The CI drum appears as a large curved arc at the bottom of the view, implying the massive drum behind it rather than rendering the full drum.

### Animation Loop (`requestAnimationFrame`)

- **Anilox rotation**: the engraved roll slowly spins; surface cells visible as a repeating dot texture colored with the channel's `displayColor`.
- **Ink drip**: ink drips fall from the chamber onto the anilox surface. Drip speed and width map to `viscosity` — thick/slow at high viscosity, thin/fast at low.

### Reactive States (Operate mode)

| Component | Reacts to | Visual change |
|---|---|---|
| Ink chamber fill | `viscosity` | Fill level and drip behavior |
| Anilox cell depth | `aniloxVolume` | Cells appear shallow (low BCM) or flooded (high BCM) |
| Impression gap | `impression` | Nip gap between plate cylinder and CI drum widens/narrows; at very high impression, plate visibly squashes against web |
| Doctor blade | `impression`, `viscosity` | Amber warning state if conditions push ink past the blade |
| Containment blade | `outcome.dryingRisk` | Highlighted amber/red if ink is at risk of drying in the chamber |

### Callout Labels

Absolutely-positioned `<div>` overlays (map-pin style) showing live values:
- Anilox: current BCM value
- Viscosity: seconds value
- Impression: percentage
- Ink strength: percentage

Labels update on every settings change. In Learn mode, each callout is replaced by the component's name and description from `pressEducation.ts`.

### Navigation

A "← Back to press" button returns to the SVG overview. In Learn mode, clicking any component (anilox, plate cylinder, chamber, doctor blade, containment blade, web, CI drum arc) opens its description card from `pressEducation.ts`.

## Educational Content (`pressEducation.ts`)

A `Record<string, { name: string; description: string }>` with initial entries for:

- `ciDrum` — the large central cylinder all stations print against
- `aniloxRoll` — engraved roller that meters a precise ink volume to the plate
- `doctorBlade` — trailing blade that wipes excess ink from anilox cells
- `containmentBlade` — leading blade that seals the ink chamber against the anilox
- `inkChamber` — enclosed reservoir delivering ink to the anilox under controlled pressure
- `plateCylinder` — carries the photopolymer plate bearing the image to be printed
- `web` — the substrate (film or paper) being printed, wrapped around the CI drum

Additional components can be added later without changing the component architecture.

## Tab Integration

`App.tsx`:
- Adds `activeTab: "output" | "press"` state, defaulting to `"output"`
- Lifts `selectedChannelId` from ControlPanel's internal `effectiveId` to App state, passed to both ControlPanel and PressModel
- Wraps the `.print-workspace` div content with tab switching logic

A tab bar renders above the workspace panel with two buttons. `CoachPanel` remains below the tab panel, visible regardless of active tab.

## Testing

- `PressModel.test.tsx`: renders without error, tab switching shows/hides correct sub-component, mode toggle changes mode prop passed to children
- `PressOverview.test.tsx`: correct number of station groups rendered for active channels, `onStationClick` fires with correct channelId, health ring color class matches density vs target
- `StationDetail.test.tsx`: renders canvas element, back button fires `onBack`, callout labels show correct values from settings
- No tests for canvas drawing internals or animation frames
