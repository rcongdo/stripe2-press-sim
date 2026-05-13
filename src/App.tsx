import { useMemo, useState } from "react";
import { CoachPanel } from "./components/CoachPanel";
import { ControlPanel } from "./components/ControlPanel";
import { MetricsStrip } from "./components/MetricsStrip";
import { PrintPreview } from "./components/PrintPreview";
import { ScoreModal } from "./components/ScoreModal";
import { starterJob } from "./domain/jobs";
import { createInitialSettings, createPerfectSettings, updateInkChannelSetting, updateSetting } from "./domain/settings";
import type { InkChannelKey, InkChannelSettingKey, PressSettingKey, RegistrationKey, ScoreSummary } from "./domain/types";
import { simulatePress } from "./simulation/engine";
import { filterCoaching, scoreRun, type TrainingMode } from "./simulation/scoring";

export default function App() {
  const [settings, setSettings] = useState(() => createInitialSettings(starterJob));
  const [mode, setMode] = useState<TrainingMode>("guided");
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const outcome = useMemo(() => simulatePress(starterJob, settings), [settings]);
  const coaching = filterCoaching(outcome.coaching, mode);

  function handleSettingChange(key: PressSettingKey, value: number) {
    setSettings((current) => updateSetting(starterJob, current, key, value));
  }

  function handleRegistrationChange(key: RegistrationKey, value: number) {
    setSettings((current) => ({
      ...current,
      registration: { ...current.registration, [key]: value },
    }));
  }

  function handleInkChannelChange(channel: InkChannelKey, key: InkChannelSettingKey, value: number) {
    setSettings((current) => updateInkChannelSetting(starterJob, current, channel, key, value));
  }

  function resetJob() {
    setSettings(createInitialSettings(starterJob));
    setScore(null);
  }

  function makePerfect() {
    setSettings(createPerfectSettings(starterJob));
    setScore(null);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Wide-web flexible packaging</p>
          <h1>Flexographic Press Simulator</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={resetJob}>
            Reset job
          </button>
          <button type="button" className="secondary-button" onClick={makePerfect}>
            Make perfect
          </button>
          <button type="button" className="primary-button" onClick={() => setScore(scoreRun(outcome))}>
            Finish run
          </button>
        </div>
      </header>
      <MetricsStrip outcome={outcome} />
      <div className="simulator-grid">
        <div className="print-workspace">
          <PrintPreview settings={settings} outcome={outcome} />
          <CoachPanel messages={coaching} mode={mode} onModeChange={setMode} />
        </div>
        <ControlPanel
          job={starterJob}
          settings={settings}
          mode={mode}
          onSettingChange={handleSettingChange}
          onRegistrationChange={handleRegistrationChange}
          onInkChannelChange={handleInkChannelChange}
        />
      </div>
      <ScoreModal score={score} onClose={() => setScore(null)} onReset={resetJob} />
    </main>
  );
}
