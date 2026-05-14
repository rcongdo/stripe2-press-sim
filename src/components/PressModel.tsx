import { useState } from "react";
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../domain/types";
import { PressOverview } from "./press/PressOverview";
import { StationDetail } from "./press/StationDetail";

export type PressMode = "operate" | "learn";
type PressView = { type: "overview" } | { type: "station"; slotIndex: number };

// Matches STATION_ANGLES in PressOverview — clockwise from top-right
const STATION_ANGLES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225] as const;

type PressModelProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  selectedChannelId: ChannelId;
  onStationSelect?: (id: ChannelId) => void;
};

export function PressModel({ job, settings, outcome, selectedChannelId, onStationSelect }: PressModelProps) {
  const [mode, setMode] = useState<PressMode>("operate");
  const [view, setView] = useState<PressView>({ type: "overview" });

  const activeChannels = job.channels.filter(ch => ch.id in settings.inkChannels);

  function goToSlot(slotIndex: number) {
    const ch = activeChannels[slotIndex];
    if (!ch) return;
    setView({ type: "station", slotIndex });
    onStationSelect?.(ch.id);
  }

  return (
    <div className="press-model">
      <div className="press-model__toolbar">
        <button
          type="button"
          className={`press-mode-btn${mode === "operate" ? " press-mode-btn--active" : ""}`}
          aria-pressed={mode === "operate"}
          onClick={() => setMode("operate")}
        >
          Operate
        </button>
        <button
          type="button"
          className={`press-mode-btn${mode === "learn" ? " press-mode-btn--active" : ""}`}
          aria-pressed={mode === "learn"}
          onClick={() => setMode("learn")}
        >
          Learn
        </button>
      </div>

      {view.type === "overview" ? (
        <PressOverview
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          selectedChannelId={selectedChannelId}
          onStationClick={(id) => {
            const slot = activeChannels.findIndex(ch => ch.id === id);
            if (slot >= 0) goToSlot(slot);
          }}
        />
      ) : (
        <StationDetail
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          channelId={activeChannels[view.slotIndex]?.id ?? activeChannels[0]?.id ?? "C"}
          stationAngle={STATION_ANGLES[view.slotIndex] ?? 0}
          stationNumber={view.slotIndex + 1}
          stationCount={activeChannels.length}
          channelName={activeChannels[view.slotIndex]?.name ?? ""}
          onPrevStation={() => goToSlot((view.slotIndex - 1 + activeChannels.length) % activeChannels.length)}
          onNextStation={() => goToSlot((view.slotIndex + 1) % activeChannels.length)}
          onBack={() => setView({ type: "overview" })}
        />
      )}
    </div>
  );
}
