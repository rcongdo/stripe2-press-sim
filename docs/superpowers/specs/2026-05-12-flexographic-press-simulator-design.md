# Flexographic Press Simulator Design

## Goal

Build a first-version desktop web simulator that helps wide-web flexible packaging press operators practice basic flexographic press setup in a game-like sandbox.

The simulator should prioritize immediate visual cause and effect. Learners adjust virtual press settings, watch a live print sample change, and use optional coaching and metrics to understand whether the setup is improving.

## Audience

The primary audience is press operators learning setup decisions and practical adjustment instincts. The first version is not aimed at process engineers, sales demos, or general flexography education, though later versions may support those audiences.

## Scope

Version 1 focuses on basic setup for a wide-web flexible packaging press. It includes:

- A desktop browser app.
- A print-first sandbox interface.
- A starter flexible packaging job.
- Adjustable press setup controls.
- A live simulated print sample.
- Press metrics and scoring.
- Optional coaching hints.
- A practice mode that hides most coaching.

Version 1 does not include:

- High-fidelity mechanical or fluid simulation.
- Full curriculum management.
- Operator accounts, saved progress, or LMS integration.
- VR, mobile-first, or tablet-specific interaction.
- Detailed machine-specific controls for a particular press manufacturer.

## Product Shape

The first version is a desktop web-based, game-like flexographic press setup sandbox for wide-web flexible packaging operators.

The main screen centers on a live print sample. As the learner changes setup variables, they immediately see density, registration, coverage, and visible defects change on the simulated web.

The simulator should be operator-believable rather than physically exhaustive. Controls must behave in plausible ways, cause and effect must stay consistent, and the learner should build useful setup instincts. Coaching, press metrics, and scoring support the experience, but the learner's primary attention stays on the print result.

## Main Interface

The app uses a print-first layout:

- Left or center: a large animated print sample showing a simplified flexible packaging job moving through the press.
- Right side: grouped operator controls.
- Top or bottom strip: live metrics.
- Optional coaching layer: visible in guided mode, quiet in practice mode.

The print sample should include enough detail to make setup errors visible:

- Process or spot-color bands.
- Solids.
- Fine type or linework.
- Registration targets.
- Areas where pinholes, weak transfer, dirty print, gain, mottle, or layer shifts can appear.

The first operator controls are:

- Substrate selection.
- Anilox volume or line screen.
- Ink viscosity or strength.
- Impression pressure.
- Web tension.
- Dryer or temperature setting.
- Press speed.
- Registration offsets.

The first live metrics are:

- Setup quality.
- Waste produced.
- Speed.
- Drying risk.
- Registration status.
- Defect count.

## Simulation Model

Version 1 uses a rule-based training model. It does not attempt to simulate full flexographic physics.

The simulation engine takes press settings and job parameters, then returns derived outcomes such as:

- Density.
- Dot gain or print gain.
- Register error.
- Drying risk.
- Waste rate.
- Defect severity.
- Setup quality score.

The rules should be simple, explainable, and tuneable. If a press expert says one effect is too strong or too weak, the app should allow that behavior to be adjusted through coefficients or rule tables rather than a UI rewrite.

Initial cause-and-effect rules:

- Too much impression increases gain, dirty print, edge squash, and plate wear risk.
- Too little impression causes weak transfer, pinholes, skips, and low density.
- High viscosity or poor anilox match affects density, mottle, filling, and drying risk.
- Tension or speed problems affect register stability, bounce sensitivity, and waste.
- Dryer settings interact with speed, ink load, and substrate to create drying warnings.
- Registration offsets directly move color layers against the target.

The renderer converts those outcomes into visible print effects. The learner should not need to read a metric to notice major problems.

## Learning Loop

The core mode is sandbox exploration:

1. The learner chooses a starter job, such as a snack pouch film job with four-color process.
2. The simulator begins with imperfect default setup settings.
3. The learner adjusts press controls until the print sample and metrics reach an acceptable setup window.
4. The learner toggles coaching when needed.
5. The learner finishes the run and receives a score based on quality, waste, and setup stability.

This creates a usable first simulator without requiring a full curriculum. Later versions can add scenario cards, timed challenges, defect-focused lessons, saved progress, and instructor-authored jobs.

## Technical Architecture

The first version should be structured as a small web app with three clear layers.

### Simulation Engine

The simulation engine is a pure rules layer. It accepts job parameters and press settings, then returns outcomes. This layer should be testable without the UI.

Responsibilities:

- Define job presets.
- Define press setting ranges and defaults.
- Calculate print and process outcomes.
- Produce coaching signals.
- Produce score components.

### Print Renderer

The print renderer turns simulation outcomes into visible effects on the print sample.

Responsibilities:

- Render the base job artwork or simplified artwork.
- Shift color layers for registration errors.
- Change density, opacity, or coverage for ink transfer outcomes.
- Add visible defects such as pinholes, dirty print, mottle, skips, or edge squash.
- Keep changes immediate and readable.

### Training UI

The training UI presents controls, metrics, coaching, reset actions, and score summaries.

Responsibilities:

- Display the live print sample.
- Let learners adjust press settings.
- Show metrics and warnings.
- Toggle guided mode and practice mode.
- Reset the job.
- Finish a run and show the resulting score.

## Data Flow

The app follows a predictable loop:

1. The learner changes a press setting.
2. The app updates the current press state.
3. The simulation engine recalculates outcomes.
4. The print renderer updates the sample.
5. The metrics strip and coaching layer update.
6. If the learner finishes the run, the app calculates and displays a score.

The simulation engine should not depend on the UI. The UI should treat simulation results as data.

## Error Handling

Version 1 should keep error handling simple and learner-friendly:

- Invalid settings are prevented by bounded controls where possible.
- If a setting combination is extreme, the app shows process warnings rather than breaking the simulation.
- Reset returns the job to its initial imperfect setup.
- The simulator should always produce a visible print result, even when settings are very poor.

## Testing Strategy

Testing should focus first on the simulation engine because it carries the learning value.

Simulation tests should verify:

- Known good setup settings produce acceptable quality and low defect severity.
- Excessive impression increases gain and dirty print severity.
- Insufficient impression lowers density and increases pinholes or skips.
- Dryer risk increases when speed and ink load exceed drying capacity.
- Registration offsets move register outcomes in the expected direction.
- Practice mode suppresses coaching while preserving metrics and simulation results.

UI tests should verify:

- Controls update simulation outcomes.
- Metrics update when settings change.
- Coaching can be toggled on and off.
- Reset restores the starter job state.
- Finish run displays a score summary.

## Open Decisions For Implementation Planning

The design intentionally leaves these choices for implementation planning:

- Exact frontend framework.
- Whether the print sample is rendered with SVG, Canvas, or HTML/CSS layers.
- Exact scoring weights.
- Exact starter job artwork.
- Exact default setting ranges.

These are implementation details, not unresolved product requirements. The product requirement is that the first version is a desktop, print-first, game-like sandbox for basic setup training on a wide-web flexible packaging press.
