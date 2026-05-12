import type { JobPreset, PressSettingKey, PressSettings, RegistrationKey } from "../domain/types";

type ControlPanelProps = {
  job: JobPreset;
  settings: PressSettings;
  onSettingChange: (key: PressSettingKey, value: number) => void;
  onRegistrationChange: (key: RegistrationKey, value: number) => void;
};

const settingOrder: PressSettingKey[] = [
  "aniloxVolume",
  "aniloxLineScreen",
  "inkViscosity",
  "inkStrength",
  "impression",
  "webTension",
  "dryerTemperature",
  "pressSpeed",
];

const registrationOrder: RegistrationKey[] = [
  "cyanX",
  "cyanY",
  "magentaX",
  "magentaY",
  "yellowX",
  "yellowY",
  "blackX",
  "blackY",
];

export function ControlPanel({
  job,
  settings,
  onSettingChange,
  onRegistrationChange,
}: ControlPanelProps) {
  return (
    <aside className="control-panel" aria-label="Press setup controls">
      <div>
        <p className="panel-label">Job</p>
        <h2>{job.name}</h2>
        <p>{job.description}</p>
      </div>
      <div className="control-group">
        <h3>Press settings</h3>
        {settingOrder.map((key) => {
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
                onChange={(event) => onSettingChange(key, Number(event.target.value))}
              />
            </label>
          );
        })}
      </div>
      <div className="control-group">
        <h3>Registration</h3>
        {registrationOrder.map((key) => (
          <label className="control" key={key}>
            <span>
              {key}
              <strong>{settings.registration[key].toFixed(1)} mil</strong>
            </span>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.registration[key]}
              onChange={(event) => onRegistrationChange(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </aside>
  );
}
