export type SubstrateId = "pet-film" | "opp-film" | "paper-laminate";

export type PressType = "ci" | "inline";
export type InkType   = "uv" | "water-based" | "solvent";

export type ChannelId = string;

export type PressSettingKey =
  | "webTension"
  | "dryerTemperature"
  | "pressSpeed";

export type RegistrationOffset = { x: number; y: number };

export type ArtworkZone =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "polygon"; points: [number, number][] };

export type ChannelDef = {
  id: ChannelId;
  name: string;
  isProcess: boolean;
  displayColor: string;
  screenAngle: number;
  artworkZones: ArtworkZone[];
  initiallyActive: boolean;
  targetDensity: number;
};

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

export type PressSettings = Record<PressSettingKey, number> & {
  substrate: SubstrateId;
  registration: Record<ChannelId, RegistrationOffset>;
  inkChannels: Record<ChannelId, InkChannelSettings>;
};

export type JobTarget = {
  density: number;
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
  channels: ChannelDef[];
  ranges: Record<PressSettingKey, SettingRange>;
  inkChannelRanges: {
    aniloxVolume: SettingRange;
    viscosity: SettingRange;
    strength: SettingRange;
    impression: SettingRange;
  };
  initialSettings: PressSettings;
  target: JobTarget;
  defaultPressType?: PressType;
  defaultInkType?:  InkType;
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
  channelDensity: Record<ChannelId, number>;
  channelGain: Record<ChannelId, number>;
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

export type LayerImages = Record<string, ImageBitmap>;

export type CustomPdfJob = JobPreset & {
  customPdf: {
    filename: string;
    layerImages: LayerImages;
  };
};
