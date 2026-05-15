import { useRef, useState } from "react";
import type { TrainingMode } from "../simulation/scoring";
import type { ChannelDef, JobPreset, PressSettingKey, PressSettings, SimulationOutcome } from "../domain/types";
import { UV_POWER_RANGE } from "../domain/jobs";
import type { InkType } from "../domain/types";
import { useLocale } from "../i18n/LocaleContext";

type MetricsStripProps = {
  job: JobPreset;
  settings: PressSettings;
  outcome: SimulationOutcome;
  mode: TrainingMode;
  inkType?: InkType;
  onSettingChange: (key: PressSettingKey, value: number) => void;
};

const PRESS_SETTING_KEYS: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];

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

function ChannelTable({ channels, outcome, densityLabel, sctvLabel }: {
  channels: ChannelDef[];
  outcome: SimulationOutcome;
  densityLabel: string;
  sctvLabel: string;
}) {
  return (
    <table className="channel-table">
      <thead>
        <tr>
          <th />
          <th className="ch-col-head">{densityLabel}</th>
          <th className="ch-col-head">{sctvLabel}</th>
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

export function MetricsStrip({ job, settings, outcome, mode, inkType = "water-based", onSettingChange }: MetricsStripProps) {
  const { t } = useLocale();

  const isUv = inkType === "uv";
  const regErr = outcome.registerError;
  const regStatus =
    regErr < 0.5 ? { label: t.metrics.registerStatus.good, color: "#22a559" } :
    regErr < 1.5 ? { label: t.metrics.registerStatus.ok,   color: "#e08c00" } :
                   { label: t.metrics.registerStatus.bad,  color: "#d63b3b" };

  const channels = job.channels.filter(ch => ch.id in outcome.channelDensity);
  const first = channels.slice(0, 5);
  const second = channels.slice(5, 10);
  const guided = mode === "guided";
  const dryerRange = isUv ? UV_POWER_RANGE : job.ranges.dryerTemperature;

  return (
    <section className="metrics-strip" aria-label="Live press metrics">
      <div className="metrics-2x2">
        <div className="metric metric--boxed">
          <span>{t.metrics.setupQuality}</span>
          <strong>{outcome.setupQuality}%</strong>
        </div>
        <div className="metric metric--boxed">
          <span>{t.metrics.waste}</span>
          <strong>{outcome.wasteRate} ft</strong>
        </div>
        <div className="metric metric--boxed">
          <span>{t.metrics.dryingRisk}</span>
          <strong>{outcome.dryingRisk}%</strong>
        </div>
        <div className="metric metric--boxed metric--register">
          <span>{t.metrics.register}</span>
          <div className="register-indicator">
            <span className="register-dot" style={{ background: regStatus.color }} />
            <strong style={{ color: regStatus.color }}>{regStatus.label}</strong>
          </div>
        </div>
      </div>

      <div className="metric metric--channels">
        <ChannelTable channels={first} outcome={outcome} densityLabel={t.metrics.density} sctvLabel={t.metrics.sctv} />
      </div>

      {second.length > 0 && (
        <div className="metric metric--channels">
          <ChannelTable channels={second} outcome={outcome} densityLabel={t.metrics.density} sctvLabel={t.metrics.sctv} />
        </div>
      )}

      <div className="metrics-job">
        <p className="metrics-job__header">
          <span className="panel-label">{t.metrics.job}</span>
          <strong>{job.name}</strong>
        </p>
        <div className="metrics-press-settings">
          {PRESS_SETTING_KEYS.map(key => {
            const range = key === "dryerTemperature" ? dryerRange : job.ranges[key];
            const inputId = `press-setting-${key}`;
            const label = key === "dryerTemperature" && isUv
              ? t.pressSettings.uvPower.label
              : t.pressSettings[key].label;
            const tip = key === "dryerTemperature" && isUv
              ? undefined
              : t.pressSettings[key].tip;
            return (
              <div className="metrics-slider" key={key}>
                <span className="metrics-slider__label">
                  <label htmlFor={inputId}>{label}</label>
                  {guided && tip && <InfoTip text={tip} />}
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
