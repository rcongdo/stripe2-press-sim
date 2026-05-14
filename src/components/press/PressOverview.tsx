import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  onStationClick: (id: ChannelId) => void;
};

export function PressOverview({ job, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.initiallyActive || true);
  return (
    <div data-testid="press-overview">
      {activeChannels.map(ch => (
        <button
          key={ch.id}
          type="button"
          data-testid={`station-${ch.id}`}
          onClick={() => onStationClick(ch.id)}
        >
          {ch.name}
        </button>
      ))}
    </div>
  );
}
