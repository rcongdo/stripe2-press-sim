import type { Locale } from "./types";

export const en: Locale = {
  appTitle: "Flexographic Press Simulator",
  pressTypes: { ci: "CI Wide Web", inline: "Inline Narrow Web" },
  inkTypes: { waterBased: "Water-based", solvent: "Solvent", uv: "UV" },
  eyebrow: (p, i) =>
    `${p === "ci" ? "CI wide-web" : "Inline narrow-web"} · ${
      i === "uv" ? "UV" : i === "solvent" ? "Solvent" : "Water-based"
    }`,

  actions: {
    resetJob: "Reset job",
    makePerfect: "Make perfect",
    finishRun: "Finish run",
    continueTuning: "Continue tuning",
    practice: "Practice",
    showHints: "Show hints",
    operate: "Operate",
    learn: "Learn",
    cancel: "Cancel",
    customPdf: "Custom PDF…",
  },

  tabs: { printedOutput: "Printed Output", pressModel: "Press Model" },

  metrics: {
    setupQuality: "Setup quality",
    waste: "Waste",
    dryingRisk: "Drying risk",
    register: "Register",
    job: "Job",
    density: "Density",
    sctv: "SCTV",
    registerStatus: { good: "Good", ok: "OK", bad: "Bad" },
  },

  pressSettings: {
    webTension: {
      label: "Web tension",
      tip: "Controls how tightly the substrate is pulled across the press. Too loose causes weaving and registration drift; too tight risks stretching or tearing, which distorts the printed image.",
    },
    dryerTemperature: {
      label: "Dryer temperature",
      tip: "Sets the temperature of the hot-air dryer that cures ink between stations. Too low leaves ink wet, causing smearing; too high can shrink or delaminate the substrate.",
    },
    pressSpeed: {
      label: "Press speed",
      tip: "How fast the web travels through the press in feet per minute. Higher speeds boost output but give inks less time to transfer and dry, raising drying risk and often reducing density.",
    },
    uvPower: { label: "UV power" },
  },

  channelSettings: {
    aniloxRoll: "Anilox roll",
    inkColor: "Ink color",
    labels: {
      aniloxVolume: "Anilox",
      viscosity: "Viscosity",
      impression: "Impression",
      strength: "Strength",
    },
    tips: {
      aniloxRoll: "The anilox is an engraved roller that meters a precise ink volume. A lighter cell (lower BCM) deposits less ink for fine work; a heavier cell floods more for solid coverage.",
      viscosity: "Ink viscosity controls flow. Lower viscosity inks transfer more readily and level out, improving dot smoothness. Higher viscosity keeps ink from flowing, preserving sharp detail on fine screens.",
      strength: "Pigment concentration. Higher strength gives rich color at lighter film weights; lower strength produces paler results that may need heavier ink deposits to hit density targets.",
      impression: "How hard the plate presses into the substrate. Too little gives weak, incomplete transfer; too much squeezes dots (dot gain), bridges highlights, and accelerates plate wear.",
      registration: "Aligns each color plate so all channels overprint correctly. Misregistration shows as color fringing along edges. Nudge the selected channel 0.1 mil per tap; aim for all channels within ±0.5 mil.",
    },
  },

  stationLabels: {
    anilox: "Anilox",
    viscosity: "Viscosity",
    impression: "Impression",
    strength: "Strength",
    plate: "Plate",
  },

  coach: {
    title: "Coaching",
    guidedSetup: "Guided setup",
    practiceMode: "Practice mode",
    noWarningsGuided: "No active warnings. Keep tuning toward the target window.",
    noWarningsPractice: "Hints are hidden. Metrics and print behavior still update.",
  },

  score: {
    runSummary: "Run summary",
    quality: "Quality",
    waste: "Waste",
    stability: "Stability",
    grades: { pressReady: "Press ready", gettingClose: "Getting close", needsWork: "Needs work" },
  },

  coachingMessages: {
    "impression-heavy": "Impression is heavy; watch for gain, dirty print, and edge squash.",
    "impression-light": "Impression is light; expect weak transfer, skips, or pinholes.",
    "drying-risk": "Drying risk is climbing; reduce speed or ink load, or increase dryer temperature.",
    "registration-offset": "Registration is visibly off target. Bring color offsets closer to zero.",
    "press-ready": "The setup is inside the press-ready window.",
  },

  education: {
    ciDrum: {
      name: "Central Impression Drum",
      description: "A large precision-machined steel cylinder that all print stations print against. The web wraps around it so every color prints on a perfectly supported surface with the same impression reference — the key advantage of CI presses over in-line stack designs.",
    },
    aniloxRoll: {
      name: "Anilox Roll",
      description: "An engraved ceramic or chrome roller covered in billions of tiny cells. Each cell holds a precise volume of ink measured in BCM (billion cubic microns per square inch) and transfers it to the plate. The anilox is the primary control over how much ink reaches the substrate.",
    },
    doctorBlade: {
      name: "Doctor Blade",
      description: "A thin steel or polymer blade pressed against the anilox roll at a trailing angle. It wipes excess ink from the roll surface, leaving only the ink held inside the engraved cells. Blade material, angle, and contact pressure all affect metering precision.",
    },
    containmentBlade: {
      name: "Containment Blade",
      description: "The leading blade of the chambered ink system. It seals the front of the ink chamber against the anilox roll to prevent ink from escaping. Together with the doctor blade it forms the fully enclosed ink reservoir.",
    },
    inkChamber: {
      name: "Ink Chamber",
      description: "An enclosed reservoir that delivers ink to the anilox roll under controlled pressure. Ink is continuously pumped in and recirculated to maintain consistent viscosity and temperature. Chambered systems reduce ink waste and solvent evaporation compared to open ink pans.",
    },
    plateCylinder: {
      name: "Plate Cylinder",
      description: "Carries the photopolymer printing plate. Raised image areas on the plate pick up ink from the anilox and transfer it to the substrate at the nip point with the CI drum. Plate-to-substrate impression is a critical setting: too light gives weak transfer, too heavy causes dot gain and accelerated plate wear.",
    },
    web: {
      name: "Web (Substrate)",
      description: "The continuous roll of film, foil, or paper being printed. On a CI press the web wraps tightly around the central drum so each colour station prints on a dimensionally stable, well-supported surface, giving CI presses exceptional registration across all colours.",
    },
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
  },

  readingPdf: "Reading PDF…",
  languageLabel: "Language",
  languageNames: { en: "English", es: "Español", de: "Deutsch", it: "Italiano" },
};
