import { useRef, useState } from "react";
import { aniloxPresets } from "../domain/jobs";
import type { TrainingMode } from "../simulation/scoring";
import type {
  ChannelId,
  InkChannelSettingKey,
  JobPreset,
  PressSettingKey,
  PressSettings,
  RegistrationOffset,
} from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  mode: TrainingMode;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onRegistrationChange: (channelId: ChannelId, offset: RegistrationOffset) => void;
  onInkChannelChange: (channel: ChannelId, key: InkChannelSettingKey, value: number) => void;
  onSpotChannelToggle: (channelId: ChannelId, active: boolean) => void;
};

const sliderKeys: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];
const inkSliderKeys: InkChannelSettingKey[] = ["viscosity", "strength", "impression"];

const TIPS: Partial<Record<PressSettingKey | InkChannelSettingKey | "aniloxRoll" | "registration", string>> = {
  webTension: "Controls how tightly the substrate is pulled across the press. Too loose causes weaving and registration drift; too tight risks stretching or tearing, which distorts the printed image.",
  dryerTemperature: "Sets the temperature of the hot-air dryer that cures ink between stations. Too low leaves ink wet, causing smearing; too high can shrink or delaminate the substrate.",
  pressSpeed: "How fast the web travels through the press in feet per minute. Higher speeds boost output but give inks less time to transfer and dry, raising drying risk and often reducing density.",
  aniloxRoll: "The anilox is an engraved roller that meters a precise ink volume. A lighter cell (lower BCM) deposits less ink for fine work; a heavier cell floods more for solid coverage.",
  viscosity: "Ink viscosity controls flow. Lower viscosity inks transfer more readily and level out, improving dot smoothness. Higher viscosity keeps ink from flowing, preserving sharp detail on fine screens.",
  strength: "Pigment concentration. Higher strength gives rich color at lighter film weights; lower strength produces paler results that may need heavier ink deposits to hit density targets.",
  impression: "How hard the plate presses into the substrate. Too little gives weak, incomplete transfer; too much squeezes dots (dot gain), bridges highlights, and accelerates plate wear.",
  registration: "Aligns each color plate so all channels overprint correctly. Misregistration shows as color fringing along edges. Nudge the selected channel 0.1 mil per tap; aim for all channels within ±0.5 mil.",
};

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
  onSettingChange, onRegistrationChange, onInkChannelChange, onSpotChannelToggle,
}: ControlPanelProps) {
  const guided = mode === "guided";

  const firstActive = job.channels.find(ch => ch.id in settings.inkChannels);
  const [selectedId, setSelectedId] = useState<ChannelId>(firstActive?.id ?? "C");

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
      <div>
        <p className="panel-label">Job</p>
        <h2>{job.name}</h2>
        <p>{job.description}</p>
      </div>

      <div className="control-group">
        <h3>Press settings</h3>
        {sliderKeys.map(key => {
          const range = job.ranges[key];
          const inputId = `setting-${key}`;
          return (
            <div className="control" key={key}>
              <span>
                <span className="control-label-row">
                  <label htmlFor={inputId}>{range.label}</label>
                  {guided && TIPS[key] && <InfoTip text={TIPS[key]!} />}
                </span>
                <strong>{settings[key]} {range.unit}</strong>
              </span>
              <input id={inputId} type="range" min={range.min} max={range.max} step={range.step}
                value={settings[key]} onChange={e => onSettingChange(key, Number(e.target.value))} />
            </div>
          );
        })}
      </div>

      <div className="control-group">
        <h3>Ink</h3>

        <div className="reg-colors" role="group" aria-label="Ink color">
          {activeChannels.map(ch => (
            <button
              key={ch.id}
              type="button"
              className={`reg-color-btn${effectiveId === ch.id ? " reg-color-btn--active" : ""}`}
              style={{ "--swatch": ch.displayColor } as React.CSSProperties}
              onClick={() => setSelectedId(ch.id)}
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
            <label htmlFor="anilox-channel-select">Anilox roll</label>
            {guided && <InfoTip text={TIPS.aniloxRoll!} />}
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
                  {guided && TIPS[key] && <InfoTip text={TIPS[key]!} />}
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
          {guided && <InfoTip text={TIPS.registration!} />}
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
