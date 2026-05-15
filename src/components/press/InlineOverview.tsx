import type { ChannelId, InkType, JobPreset, PressSettings, SimulationOutcome } from "../../domain/types";
import type { PressMode } from "../PressModel";

type Props = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: PressMode;
  selectedChannelId: ChannelId;
  inkType: InkType;
  onStationClick: (id: ChannelId) => void;
};

export function InlineOverview({ job, settings, outcome, mode, selectedChannelId, inkType, onStationClick }: Props) {
  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);

  return (
    <svg
      data-testid="press-overview"
      viewBox="0 0 900 400"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="900" height="400" fill="#1a1a2e" rx="8" />
      {activeChannels.map((ch, i) => (
        <g
          key={ch.id}
          data-testid={`station-${ch.id}`}
          data-selected={ch.id === selectedChannelId ? "true" : undefined}
          onClick={() => onStationClick(ch.id)}
          style={{ cursor: "pointer" }}
        >
          <rect x={60 + i * 80} y={160} width={60} height={60} rx="4" fill="#2a2a4a" />
          <text x={90 + i * 80} y={195} textAnchor="middle" fill="white" fontSize="10">
            {ch.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
