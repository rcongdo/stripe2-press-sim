export type Lang = "en" | "es";

export type Locale = {
  appTitle: string;
  pressTypes: { ci: string; inline: string };
  inkTypes: { waterBased: string; solvent: string; uv: string };
  eyebrow: (pressType: "ci" | "inline", inkType: "water-based" | "solvent" | "uv") => string;

  actions: {
    resetJob: string;
    makePerfect: string;
    finishRun: string;
    continueTuning: string;
    practice: string;
    showHints: string;
    operate: string;
    learn: string;
    cancel: string;
  };

  tabs: { printedOutput: string; pressModel: string };

  metrics: {
    setupQuality: string;
    waste: string;
    dryingRisk: string;
    register: string;
    job: string;
    density: string;
    sctv: string;
    registerStatus: { good: string; ok: string; bad: string };
  };

  pressSettings: {
    webTension:       { label: string; tip: string };
    dryerTemperature: { label: string; tip: string };
    pressSpeed:       { label: string; tip: string };
    uvPower:          { label: string };
  };

  channelSettings: {
    aniloxRoll: string;
    inkColor: string;
    labels: {
      aniloxVolume: string;
      viscosity: string;
      impression: string;
      strength: string;
    };
    tips: {
      aniloxRoll: string;
      viscosity: string;
      impression: string;
      strength: string;
      registration: string;
    };
  };

  stationLabels: {
    anilox: string;
    viscosity: string;
    impression: string;
    strength: string;
    plate: string;
  };

  coach: {
    title: string;
    guidedSetup: string;
    practiceMode: string;
    noWarningsGuided: string;
    noWarningsPractice: string;
  };

  score: {
    runSummary: string;
    quality: string;
    waste: string;
    stability: string;
    grades: { pressReady: string; gettingClose: string; needsWork: string };
  };

  coachingMessages: Record<
    "impression-heavy" | "impression-light" | "drying-risk" | "registration-offset" | "press-ready",
    string
  >;

  education: Record<
    | "ciDrum" | "aniloxRoll" | "doctorBlade" | "containmentBlade" | "inkChamber"
    | "plateCylinder" | "web" | "inlinePress" | "impressionCylinder"
    | "fountainRoll" | "interStationDryer",
    { name: string; description: string }
  >;

  readingPdf: string;
  languageLabel: string;
  languageNames: { en: string; es: string };
};
