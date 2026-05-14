import { useMemo, useState } from "react";
import { CoachPanel } from "./components/CoachPanel";
import { ControlPanel } from "./components/ControlPanel";
import { MetricsStrip } from "./components/MetricsStrip";
import { PressModel } from "./components/PressModel";
import { PrintPreview } from "./components/PrintPreview";
import { PdfUploadModal } from "./components/PdfUploadModal";
import { ScoreModal } from "./components/ScoreModal";
import { JOB_REGISTRY, snackPouchJob } from "./domain/jobs";
import {
  activateSpotChannel,
  createInitialSettings,
  createPerfectSettings,
  deactivateSpotChannel,
  updateInkChannelSetting,
  updateSetting,
} from "./domain/settings";
import type {
  ChannelId,
  CustomPdfJob,
  InkChannelSettingKey,
  JobPreset,
  PressSettingKey,
  RegistrationOffset,
} from "./domain/types";
import { simulatePress } from "./simulation/engine";
import { filterCoaching, scoreRun, type TrainingMode } from "./simulation/scoring";

export default function App() {
  const [selectedJob, setSelectedJob] = useState<JobPreset>(snackPouchJob);
  const [settings, setSettings] = useState(() => createInitialSettings(snackPouchJob));
  const [mode, setMode] = useState<TrainingMode>("guided");
  const [score, setScore] = useState<ReturnType<typeof scoreRun> | null>(null);
  const [activeTab, setActiveTab] = useState<"output" | "press">("output");
  const [selectedChannelId, setSelectedChannelId] = useState<ChannelId>(
    snackPouchJob.channels.find(ch => ch.initiallyActive)?.id ?? "C"
  );
  const [customJob,      setCustomJob]      = useState<CustomPdfJob | null>(null);
  const [showPdfUpload,  setShowPdfUpload]  = useState(false);

  const activeJob = customJob ?? selectedJob;

  const outcome = useMemo(() => simulatePress(activeJob, settings), [activeJob, settings]);
  const coaching = filterCoaching(outcome.coaching, mode);

  function switchJob(job: JobPreset) {
    setSelectedJob(job);
    setCustomJob(null);
    setSettings(createInitialSettings(job));
    setScore(null);
    setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
  }

  function handleSettingChange(key: PressSettingKey, value: number) {
    setSettings(current => updateSetting(activeJob, current, key, value));
  }

  function handleRegistrationChange(channelId: ChannelId, offset: RegistrationOffset) {
    setSettings(current => ({
      ...current,
      registration: { ...current.registration, [channelId]: offset },
    }));
  }

  function handleInkChannelChange(channel: ChannelId, key: InkChannelSettingKey, value: number) {
    setSettings(current => updateInkChannelSetting(activeJob, current, channel, key, value));
  }

  function handleSpotChannelToggle(channelId: ChannelId, active: boolean) {
    setSettings(current =>
      active
        ? activateSpotChannel(activeJob, current, channelId)
        : deactivateSpotChannel(current, channelId)
    );
  }

  function resetJob() {
    setSettings(createInitialSettings(activeJob));
    setScore(null);
  }

  function makePerfect() {
    setSettings(createPerfectSettings(activeJob));
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
          <select
            className="job-selector"
            value={customJob ? "__custom__" : selectedJob.id}
            aria-label="Select job"
            onChange={e => {
              if (e.target.value === "__custom__") {
                setShowPdfUpload(true);
              } else {
                const job = JOB_REGISTRY.find(j => j.id === e.target.value);
                if (job) switchJob(job);
              }
            }}
          >
            {JOB_REGISTRY.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            <option value="__custom__">
              {customJob ? customJob.name : "Custom PDF…"}
            </option>
          </select>
          <button type="button" className="secondary-button" onClick={resetJob}>Reset job</button>
          <button type="button" className="secondary-button" onClick={makePerfect}>Make perfect</button>
          <button type="button" className="primary-button" onClick={() => setScore(scoreRun(outcome))}>Finish run</button>
        </div>
      </header>

      <MetricsStrip
        job={activeJob}
        settings={settings}
        outcome={outcome}
        mode={mode}
        onSettingChange={handleSettingChange}
      />

      <div className="simulator-grid">
        <div className="print-workspace">
          <div className="workspace-tabs">
            <button
              type="button"
              className={`workspace-tab${activeTab === "output" ? " workspace-tab--active" : ""}`}
              onClick={() => setActiveTab("output")}
            >
              Printed Output
            </button>
            <button
              type="button"
              className={`workspace-tab${activeTab === "press" ? " workspace-tab--active" : ""}`}
              onClick={() => setActiveTab("press")}
            >
              Press Model
            </button>
          </div>
          {activeTab === "output" ? (
            <PrintPreview settings={settings} outcome={outcome} job={activeJob} />
          ) : (
            <PressModel
              job={activeJob}
              settings={settings}
              outcome={outcome}
              selectedChannelId={selectedChannelId}
              onStationSelect={setSelectedChannelId}
            />
          )}
          <CoachPanel messages={coaching} mode={mode} onModeChange={setMode} />
        </div>
        <ControlPanel
          job={activeJob}
          settings={settings}
          mode={mode}
          selectedChannelId={selectedChannelId}
          onRegistrationChange={handleRegistrationChange}
          onInkChannelChange={handleInkChannelChange}
          onSpotChannelToggle={handleSpotChannelToggle}
          onChannelSelect={setSelectedChannelId}
        />
      </div>
      <ScoreModal score={score} onClose={() => setScore(null)} onReset={resetJob} />
      {showPdfUpload && (
        <PdfUploadModal
          onConfirm={job => {
            setCustomJob(job);
            setSettings(createInitialSettings(job));
            setScore(null);
            setSelectedChannelId(job.channels.find(ch => ch.initiallyActive)?.id ?? "C");
            setShowPdfUpload(false);
          }}
          onCancel={() => setShowPdfUpload(false)}
        />
      )}
    </main>
  );
}
