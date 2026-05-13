import type { InkChannelKey, SimulationOutcome } from "../domain/types";

type MetricsStripProps = {
  outcome: SimulationOutcome;
};

const CHANNELS: InkChannelKey[] = ["C", "M", "Y", "K"];
const CHANNEL_COLOR: Record<InkChannelKey, string> = {
  C: "#00bef0",
  M: "#e0009a",
  Y: "#c89400",
  K: "#222",
};

function registerStatus(err: number): { label: string; color: string } {
  if (err < 0.5) return { label: "Good", color: "#22a559" };
  if (err < 1.5) return { label: "OK",   color: "#e08c00" };
  return              { label: "Off",  color: "#d63b3b" };
}

export function MetricsStrip({ outcome }: MetricsStripProps) {
  const reg = registerStatus(outcome.registerError);

  return (
    <section className="metrics-strip" aria-label="Live press metrics">
      <div className="metric">
        <span>Setup quality</span>
        <strong>{outcome.setupQuality}%</strong>
      </div>

      <div className="metric">
        <span>Waste</span>
        <strong>{outcome.wasteRate} ft</strong>
      </div>

      <div className="metric metric--channels">
        <span>Density / Gain</span>
        <table className="channel-table">
          <tbody>
            {CHANNELS.map((ch) => (
              <tr key={ch}>
                <td className="ch-swatch" style={{ color: CHANNEL_COLOR[ch] }}>{ch}</td>
                <td className="ch-val">{outcome.channelDensity[ch].toFixed(2)}</td>
                <td className="ch-val">{Math.round(outcome.channelGain[ch] * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="metric">
        <span>Drying risk</span>
        <strong>{outcome.dryingRisk}%</strong>
      </div>

      <div className="metric metric--register">
        <span>Register</span>
        <div className="register-indicator">
          <span className="register-dot" style={{ background: reg.color }} />
          <strong style={{ color: reg.color }}>{reg.label}</strong>
          <span className="register-sub">{outcome.registerError.toFixed(2)} mil</span>
        </div>
      </div>
    </section>
  );
}
