# Flexographic Press Simulator

An interactive training tool that simulates a wide-web flexographic press for flexible packaging. Operators adjust press settings in real time and see how each change affects print quality, defects, and waste.

## What it simulates

The simulator models a four-color CMYK flexographic press printing onto PET film. Every setting change immediately updates a live print sample and a metrics strip so you can observe cause-and-effect relationships without touching real equipment.

**Per-channel ink controls (C / M / Y / K)**
- Anilox roll selection (preset BCM/lpi combinations)
- Ink viscosity
- Ink strength
- Impression pressure

**Press-wide controls**
- Web tension
- Dryer temperature
- Press speed

**Registration**
- X/Y offset per color channel via a d-pad nudge control

## What the simulation computes

| Metric | Description |
|--------|-------------|
| Density | Mean optical density across CMYK channels |
| Dot gain | Tonal value increase from target |
| Register error | Euclidean magnitude of all color offsets |
| Drying risk | Demand vs. dryer capacity at current speed and ink load |
| Setup quality | 0–100 composite score; 100 = perfect press-ready window |
| Waste rate | Estimated substrate waste (fpm-equivalent) |

Defects modeled: pinholes, dirty print, mottle, skips, edge squash.

## Print preview

The canvas renders three pouches of a snack packaging design with full CMYK separation.

- **1× zoom** — continuous-tone overview; all four ink channels blended at their coverage levels
- **4× zoom** — halftone dot grid at native canvas resolution; screen angles (C 15°, M 75°, Y 0°, K 45°) and dot gain visible

## Coaching panel

In **Guided** mode the panel shows live feedback as settings drift out of the press-ready window (heavy/light impression, drying risk, registration offset). Switch to **Practice** mode to hide hints.

## Scoring

Click **Finish run** to receive a scored summary across three dimensions: setup quality, waste rate, and press stability. Grades: Needs work → Getting close → Press ready.

## Development

```bash
npm install
npm run dev        # Vite dev server at localhost:5173
npm test           # Vitest unit tests
npm run e2e        # Playwright end-to-end tests
npm run build      # Production build
```

**Stack:** React 19 · TypeScript · Vite 7 · Vitest · Canvas 2D API

## Project structure

```
src/
  domain/          # Types, job presets, settings helpers
  simulation/      # Press engine (engine.ts) and run scoring (scoring.ts)
  components/      # React UI components
    PrintPreview   # Canvas renderer
    ControlPanel   # All press and ink controls
    MetricsStrip   # Live metric readouts
    CoachPanel     # Coaching messages
    ScoreModal     # End-of-run score summary
  App.tsx          # Root — state, handlers, layout
```
