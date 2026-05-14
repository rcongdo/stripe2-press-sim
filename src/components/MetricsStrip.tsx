import { useRef, useState } from "react";
import type { TrainingMode } from "../simulation/scoring";
import type { ChannelDef, JobPreset, PressSettingKey, PressSettings, SimulationOutcome } from "../domain/types";

type MetricsStripProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: TrainingMode;
  onSettingChange: (key: PressSettingKey, value: number) => void;
};

const PRESS_SETTING_KEYS: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];

const PRESS_TIPS: Partial<Record<PressSettingKey, string>> = {
  webTension: "Controls how tightly the substrate is pulled across the press. Too loose causes weaving and registration drift; too tight risks stretching or tearing, which distorts the printed image.",
  dryerTemperature: "Sets the temperature of the hot-air dryer that cures ink between stations. Too low leaves ink wet, causing smearing; too high can shrink or delaminate the substrate.",
  pressSpeed: "How fast the web travels through the press in feet per minute. Higher speeds boost output but give inks less time to transfer and dry, raising drying risk and often reducing density.",
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

function registerStatus(err: number): { label: string; color: string } {
  if (err < 0.5) return { label: "Good", color: "#22a559" };
  if (err < 1.5) return { label: "OK",   color: "#e08c00" };
  return              { label: "Bad",  color: "#d63b3b" };
}

function ChannelTable({ channels, outcome }: { channels: ChannelDef[]; outcome: SimulationOutcome }) {
  return (
    <table className="channel-table">
      <thead>
        <tr>
          <th />
          <th className="ch-col-head">Density</th>
          <th className="ch-col-head">SCTV</th>
        </tr>
      </thead>
      <tbody>
        {channels.map(ch => {
          const sctv = Math.round((outcome.channelGain[ch.id] ?? 0) * 100);
          const sctvStr = sctv > 0 ? `+${sctv}%` : `${sctv}%`;
          return (
            <tr key={ch.id}>
              <td className="ch-swatch" style={{ color: ch.displayColor }}>
                {ch.id.length === 1 ? ch.id : ch.id.slice(0, 2).toUpperCase()}
              </td>
              <td className="ch-val">{(outcome.channelDensity[ch.id] ?? 0).toFixed(2)}</td>
              <td className="ch-val">{sctvStr}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function MetricsStrip({ job, settings, outcome, mode, onSettingChange }: MetricsStripProps) {
  const reg = registerStatus(outcome.registerError);
  const channels = job.channels.filter(ch => ch.id in outcome.channelDensity);
  const first = channels.slice(0, 5);
  const second = channels.slice(5, 10);

  const guided = mode === "guided";

  return (
    <section className="metrics-strip" aria-label="Live press metrics">
      <div className="metrics-2x2">
        <div className="metric metric--boxed">
          <span>Setup quality</span>
          <strong>{outcome.setupQuality}%</strong>
        </div>
        <div className="metric metric--boxed">
          <span>Waste</span>
          <strong>{outcome.wasteRate} ft</strong>
        </div>
        <div className="metric metric--boxed">
          <span>Drying risk</span>
          <strong>{outcome.dryingRisk}%</strong>
        </div>
        <div className="metric metric--boxed metric--register">
          <span>Register</span>
          <div className="register-indicator">
            <span className="register-dot" style={{ background: reg.color }} />
            <strong style={{ color: reg.color }}>{reg.label}</strong>
          </div>
        </div>
      </div>

      <div className="metric metric--channels">
        <ChannelTable channels={first} outcome={outcome} />
      </div>

      {second.length > 0 && (
        <div className="metric metric--channels">
          <ChannelTable channels={second} outcome={outcome} />
        </div>
      )}

      <div className="metrics-job">
        <p className="metrics-job__header">
          <span className="panel-label">Job</span>
          <strong>{job.name}</strong>
        </p>
        <div className="metrics-press-settings">
          {PRESS_SETTING_KEYS.map(key => {
            const range = job.ranges[key];
            const inputId = `press-setting-${key}`;
            return (
              <div className="metrics-slider" key={key}>
                <span className="metrics-slider__label">
                  <label htmlFor={inputId}>{range.label}</label>
                  {guided && PRESS_TIPS[key] && <InfoTip text={PRESS_TIPS[key]!} />}
                </span>
                <strong className="metrics-slider__value">{settings[key]} {range.unit}</strong>
                <input id={inputId} type="range" min={range.min} max={range.max} step={range.step}
                  value={settings[key]} onChange={e => onSettingChange(key, Number(e.target.value))} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
