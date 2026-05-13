export type SubstrateId = "pet-film" | "opp-film" | "paper-laminate";

export type PressSettingKey =
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

export type InkChannelKey = "C" | "M" | "Y" | "K";

export type InkChannelSettings = {
  aniloxVolume: number;
  viscosity: number;
  strength: number;
  impression: number;
};

export type InkChannelSettingKey = keyof InkChannelSettings;

export type SettingRange = {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
};

export type AniloxPresetId =
  | "ultra-fine"
  | "fine"
  | "standard"
  | "medium-heavy"
  | "heavy"
  | "very-heavy";

export type AniloxPreset = {
  id: AniloxPresetId;
  label: string;
  lineScreen: number;
  volume: number;
};

export type Registration = Record<RegistrationKey, number>;

export type PressSettings = Record<PressSettingKey, number> & {
  substrate: SubstrateId;
  registration: Registration;
  inkChannels: Record<InkChannelKey, InkChannelSettings>;
};

export type JobTarget = {
  density: number;
  channelTargetDensity: Record<InkChannelKey, number>;
  gain: number;
  dryingCapacity: number;
  tension: number;
  speed: number;
  aniloxVolume: number;
  viscosity: number;
  impression: number;
};

export type JobPreset = {
  id: string;
  name: string;
  description: string;
  substrateOptions: SubstrateId[];
  ranges: Record<PressSettingKey, SettingRange>;
  inkChannelRanges: {
    aniloxVolume: SettingRange;
    viscosity: SettingRange;
    strength: SettingRange;
    impression: SettingRange;
  };
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
  channelDensity: Record<InkChannelKey, number>;
  channelGain: Record<InkChannelKey, number>;
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
