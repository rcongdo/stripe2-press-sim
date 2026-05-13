import type { JobPreset, SimulationOutcome } from "../domain/types";

type MetricsStripProps = {
  job: JobPreset;
  outcome: SimulationOutcome;
};

function registerStatus(err: number): { label: string; color: string } {
  if (err < 0.5) return { label: "Good", color: "#22a559" };
  if (err < 1.5) return { label: "OK",   color: "#e08c00" };
  return              { label: "Bad",  color: "#d63b3b" };
}

export function MetricsStrip({ job, outcome }: MetricsStripProps) {
  const reg = registerStatus(outcome.registerError);
  const activeChannels = job.channels.filter(ch => ch.id in outcome.channelDensity);

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
        <table className="channel-table">
          <thead>
            <tr>
              <th />
              <th className="ch-col-head">Density</th>
              <th className="ch-col-head">SCTV</th>
            </tr>
          </thead>
          <tbody>
            {activeChannels.map(ch => {
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
      </div>
    </section>
  );
}
