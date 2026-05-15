import { useEffect, useRef, useState } from "react";
import { aniloxPresets } from "../domain/jobs";
import { useLocale } from "../i18n/LocaleContext";
import type { TrainingMode } from "../simulation/scoring";
import type {
  ChannelId,
  InkChannelSettingKey,
  JobPreset,
  PressSettings,
  RegistrationOffset,
} from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  mode: TrainingMode;
  onRegistrationChange: (channelId: ChannelId, offset: RegistrationOffset) => void;
  onInkChannelChange: (channel: ChannelId, key: InkChannelSettingKey, value: number) => void;
  onSpotChannelToggle: (channelId: ChannelId, active: boolean) => void;
  onChannelSelect?: (id: ChannelId) => void;
  selectedChannelId?: ChannelId;
};

const inkSliderKeys: InkChannelSettingKey[] = ["viscosity", "strength", "impression"];

function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleEnter() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 10 });
    }
  }

  return (
    <>
      <button ref={btnRef} type="button" className="info-tip-btn" aria-label="More information"
        onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>ⓘ</button>
      {pos && <div className="info-tip-popup" style={{ top: pos.top, left: pos.left }}>{text}</div>}
    </>
  );
}

export function ControlPanel({
  job, settings, mode,
  onRegistrationChange, onInkChannelChange, onSpotChannelToggle,
  onChannelSelect, selectedChannelId,
}: ControlPanelProps) {
  const guided = mode === "guided";
  const { t } = useLocale();

  const firstActive = job.channels.find(ch => ch.id in settings.inkChannels);
  const [selectedId, setSelectedId] = useState<ChannelId>(firstActive?.id ?? "C");

  useEffect(() => {
    if (selectedChannelId && selectedChannelId in settings.inkChannels) {
      setSelectedId(selectedChannelId);
    }
  }, [selectedChannelId, settings.inkChannels]);

  function selectChannel(id: ChannelId) {
    setSelectedId(id);
    onChannelSelect?.(id);
  }

  const effectiveId = selectedId in settings.inkChannels
    ? selectedId
    : (firstActive?.id ?? "C");

  const inkCh = effectiveId;
  const inkCurrentPreset =
    aniloxPresets.find(p => p.volume === settings.inkChannels[inkCh]?.aniloxVolume) ??
    aniloxPresets.find(p => p.id === "heavy")!;

  function nudge(axis: "x" | "y", delta: number) {
    const current = settings.registration[inkCh] ?? { x: 0, y: 0 };
    const next = {
      x: axis === "x" ? parseFloat(Math.min(4, Math.max(-4, current.x + delta)).toFixed(1)) : current.x,
      y: axis === "y" ? parseFloat(Math.min(4, Math.max(-4, current.y + delta)).toFixed(1)) : current.y,
    };
    onRegistrationChange(inkCh, next);
  }

  const reg = settings.registration[inkCh] ?? { x: 0, y: 0 };

  const activeChannels  = job.channels.filter(ch => ch.id in settings.inkChannels);
  const inactiveSpots   = job.channels.filter(ch => !ch.isProcess && !(ch.id in settings.inkChannels));

  return (
    <aside className="control-panel" aria-label="Press setup controls">
      <div className="control-group">
        <h3>Ink</h3>

        <div className="reg-colors" role="group" aria-label={t.channelSettings.inkColor}>
          {activeChannels.map(ch => (
            <button
              key={ch.id}
              type="button"
              className={`reg-color-btn${effectiveId === ch.id ? " reg-color-btn--active" : ""}`}
              style={{ "--swatch": ch.displayColor } as React.CSSProperties}
              onClick={() => selectChannel(ch.id)}
              aria-pressed={effectiveId === ch.id}
            >
              {ch.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {inactiveSpots.length > 0 && (
          <div className="spot-add-list">
            {inactiveSpots.map(ch => (
              <button key={ch.id} type="button" className="secondary-button spot-add-btn"
                onClick={() => onSpotChannelToggle(ch.id, true)}
                aria-label={`Add ${ch.name}`}>
                + {ch.name}
              </button>
            ))}
          </div>
        )}

        {activeChannels.filter(ch => !ch.isProcess).map(ch => (
          <button key={ch.id} type="button" className="secondary-button spot-remove-btn"
            onClick={() => onSpotChannelToggle(ch.id, false)}
            aria-label={`Remove ${ch.name}`}>
            Remove {ch.name}
          </button>
        ))}

        <div className="control anilox-select">
          <span className="control-label-row">
            <label htmlFor="anilox-channel-select">{t.channelSettings.aniloxRoll}</label>
            {guided && <InfoTip text={t.channelSettings.tips.aniloxRoll} />}
          </span>
          <select id="anilox-channel-select" value={inkCurrentPreset.id}
            onChange={e => {
              const preset = aniloxPresets.find(p => p.id === e.target.value);
              if (preset) onInkChannelChange(inkCh, "aniloxVolume", preset.volume);
            }}>
            {aniloxPresets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {inkSliderKeys.map(key => {
          const range = job.inkChannelRanges[key];
          const inputId = `ink-${inkCh}-${key}`;
          return (
            <div className="control" key={key}>
              <span>
                <span className="control-label-row">
                  <label htmlFor={inputId}>{range.label}</label>
                  {guided && t.channelSettings.tips[key as keyof typeof t.channelSettings.tips] && (
                    <InfoTip text={t.channelSettings.tips[key as keyof typeof t.channelSettings.tips]!} />
                  )}
                </span>
                <strong>{settings.inkChannels[inkCh]?.[key]} {range.unit}</strong>
              </span>
              <input id={inputId} type="range" min={range.min} max={range.max} step={range.step}
                value={settings.inkChannels[inkCh]?.[key] ?? range.min}
                aria-label={range.label}
                onChange={e => onInkChannelChange(inkCh, key, Number(e.target.value))} />
            </div>
          );
        })}

        <div className="reg-readout">
          <span>X: <strong>{reg.x.toFixed(1)} mil</strong></span>
          <span>Y: <strong>{reg.y.toFixed(1)} mil</strong></span>
          {guided && <InfoTip text={t.channelSettings.tips.registration} />}
        </div>
        <div className="reg-dpad">
          <button type="button" className="reg-dpad__btn" aria-label="up"    onClick={() => nudge("y", -0.1)}>↑</button>
          <div className="reg-dpad__row">
            <button type="button" className="reg-dpad__btn" aria-label="left"  onClick={() => nudge("x", -0.1)}>←</button>
            <div className="reg-dpad__center" />
            <button type="button" className="reg-dpad__btn" aria-label="right" onClick={() => nudge("x",  0.1)}>→</button>
          </div>
          <button type="button" className="reg-dpad__btn" aria-label="down"  onClick={() => nudge("y",  0.1)}>↓</button>
        </div>
      </div>
    </aside>
  );
}
