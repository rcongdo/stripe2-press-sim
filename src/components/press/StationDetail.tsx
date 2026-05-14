import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  channelId: ChannelId;
  onBack: () => void;
};

export function StationDetail({ onBack }: Props) {
  return (
    <div data-testid="station-detail">
      <button type="button" onClick={onBack}>← Back to press</button>
      <canvas />
    </div>
  );
}
