import { useState } from "react";
import { aniloxPresets } from "../domain/jobs";
import type {
  InkChannelKey,
  InkChannelSettingKey,
  JobPreset,
  PressSettingKey,
  PressSettings,
  RegistrationKey,
} from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onRegistrationChange: (key: RegistrationKey, value: number) => void;
  onInkChannelChange: (channel: InkChannelKey, key: InkChannelSettingKey, value: number) => void;
};

type ColorName = "cyan" | "magenta" | "yellow" | "black";

const colorOrder: ColorName[] = ["cyan", "magenta", "yellow", "black"];

const colorKeys: Record<ColorName, { x: RegistrationKey; y: RegistrationKey }> = {
  cyan:    { x: "cyanX",    y: "cyanY" },
  magenta: { x: "magentaX", y: "magentaY" },
  yellow:  { x: "yellowX",  y: "yellowY" },
  black:   { x: "blackX",   y: "blackY" },
};

const colorSwatches: Record<ColorName, string> = {
  cyan:    "#00a7c8",
  magenta: "#d3266c",
  yellow:  "#c8a000",
  black:   "#202124",
};

const inkChannelMap: Record<ColorName, InkChannelKey> = {
  cyan: "C", magenta: "M", yellow: "Y", black: "K",
};

const sliderKeys: PressSettingKey[] = ["webTension", "dryerTemperature", "pressSpeed"];

const inkSliderKeys: InkChannelSettingKey[] = ["viscosity", "strength", "impression"];

export function ControlPanel({
  job,
  settings,
  onSettingChange,
  onRegistrationChange,
  onInkChannelChange,
}: ControlPanelProps) {
  const [selectedColor, setSelectedColor] = useState<ColorName>("cyan");

  const inkCh = inkChannelMap[selectedColor];
  const inkCurrentPreset =
    aniloxPresets.find((p) => p.volume === settings.inkChannels[inkCh].aniloxVolume) ??
    aniloxPresets.find((p) => p.id === "heavy")!;

  function nudge(axis: "x" | "y", delta: number) {
    const key = colorKeys[selectedColor][axis];
    const current = settings.registration[key];
    onRegistrationChange(key, Math.min(4, Math.max(-4, parseFloat((current + delta).toFixed(1)))));
  }

  const regX = settings.registration[colorKeys[selectedColor].x];
  const regY = settings.registration[colorKeys[selectedColor].y];

  return (
    <aside className="control-panel" aria-label="Press setup controls">
      <div>
        <p className="panel-label">Job</p>
        <h2>{job.name}</h2>
        <p>{job.description}</p>
      </div>

      <div className="control-group">
        <h3>Press settings</h3>
        {sliderKeys.map((key) => {
          const range = job.ranges[key];
          return (
            <label className="control" key={key}>
              <span>
                {range.label}
                <strong>
                  {settings[key]} {range.unit}
                </strong>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={settings[key]}
                onChange={(e) => onSettingChange(key, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>

      <div className="control-group">
        <h3>Ink</h3>
        <div className="reg-colors" role="group" aria-label="Ink color">
          {colorOrder.map((color) => (
            <button
              key={color}
              type="button"
              className={`reg-color-btn${selectedColor === color ? " reg-color-btn--active" : ""}`}
              style={{ "--swatch": colorSwatches[color] } as React.CSSProperties}
              onClick={() => setSelectedColor(color)}
              aria-pressed={selectedColor === color}
            >
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </button>
          ))}
        </div>
        <label className="control anilox-select" htmlFor="anilox-channel-select">
          <span>Anilox roll</span>
          <select
            id="anilox-channel-select"
            value={inkCurrentPreset.id}
            onChange={(e) => {
              const preset = aniloxPresets.find((p) => p.id === e.target.value);
              if (preset) onInkChannelChange(inkCh, "aniloxVolume", preset.volume);
            }}
          >
            {aniloxPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {inkSliderKeys.map((key) => {
          const range = job.inkChannelRanges[key];
          return (
            <label className="control" key={key}>
              <span>
                {range.label}
                <strong>
                  {settings.inkChannels[inkCh][key]} {range.unit}
                </strong>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={settings.inkChannels[inkCh][key]}
                aria-label={range.label}
                onChange={(e) => onInkChannelChange(inkCh, key, Number(e.target.value))}
              />
            </label>
          );
        })}
        <div className="reg-readout">
          <span>X: <strong>{regX.toFixed(1)} mil</strong></span>
          <span>Y: <strong>{regY.toFixed(1)} mil</strong></span>
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
