import type { SimulationOutcome } from "../domain/types";

type MetricsStripProps = {
  outcome: SimulationOutcome;
};

export function MetricsStrip({ outcome }: MetricsStripProps) {
  const metrics = [
    ["Setup quality", `${outcome.setupQuality}%`],
    ["Waste", `${outcome.wasteRate} ft`],
    ["Density", outcome.density.toFixed(2)],
    ["Gain", `${Math.round(outcome.gain * 100)}%`],
    ["Drying risk", `${outcome.dryingRisk}%`],
    ["Register", `${outcome.registerError.toFixed(2)} mil`],
  ];

  return (
    <section className="metrics-strip" aria-label="Live press metrics">
      {metrics.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
