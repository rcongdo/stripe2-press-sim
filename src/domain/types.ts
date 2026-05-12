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
