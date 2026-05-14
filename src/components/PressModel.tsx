import { useState } from "react";
import type { ChannelId, JobPreset, PressSettings, SimulationOutcome } from "../domain/types";
import { PressOverview } from "./press/PressOverview";
import { StationDetail } from "./press/StationDetail";

export type PressMode = "operate" | "learn";
type PressView = { type: "overview" } | { type: "station"; channelId: ChannelId };

type PressModelProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  selectedChannelId: ChannelId;
};

export function PressModel({ job, settings, outcome, selectedChannelId }: PressModelProps) {
  const [mode, setMode] = useState<PressMode>("operate");
  const [view, setView] = useState<PressView>({ type: "overview" });

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
          onStationClick={id => setView({ type: "station", channelId: id })}
        />
      ) : (
        <StationDetail
          job={job}
          settings={settings}
          outcome={outcome}
          mode={mode}
          channelId={view.channelId}
          onBack={() => setView({ type: "overview" })}
        />
      )}
    </div>
  );
}
