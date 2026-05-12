import type { PressSettings, SimulationOutcome } from "../domain/types";

type PrintPreviewProps = {
  settings: PressSettings;
  outcome: SimulationOutcome;
};

function shift(value: number): number {
  return value * 4;
}

export function PrintPreview({ settings, outcome }: PrintPreviewProps) {
  const densityOpacity = Math.min(1, Math.max(0.35, outcome.density));
  const gainScale = 1 + outcome.gain * 0.45;

  return (
    <section className="print-preview" aria-label="Live print sample">
      <div className="print-preview__header">
        <span>Live print sample</span>
        <strong>{outcome.setupQuality}% setup quality</strong>
      </div>
      <svg viewBox="0 0 920 420" role="img" aria-label="Simulated flexible packaging web">
        <rect width="920" height="420" rx="18" fill="#f6f1e8" />
        <rect x="26" y="28" width="868" height="364" rx="10" fill="#fffdf8" />
        <g opacity={densityOpacity}>
          <g data-testid="cyan-layer" transform={`translate(${shift(settings.registration.cyanX)} ${shift(settings.registration.cyanY)})`}>
            <rect x="70" y="70" width="260" height="112" fill="#0088b8" />
            <circle cx="660" cy="150" r={72 * gainScale} fill="#00a7c8" opacity="0.82" />
          </g>
          <g data-testid="magenta-layer" transform={`translate(${shift(settings.registration.magentaX)} ${shift(settings.registration.magentaY)})`}>
            <rect x="132" y="106" width="250" height="112" fill="#c83564" opacity="0.85" />
            <circle cx="704" cy="190" r={58 * gainScale} fill="#d3266c" opacity="0.78" />
          </g>
          <g data-testid="yellow-layer" transform={`translate(${shift(settings.registration.yellowX)} ${shift(settings.registration.yellowY)})`}>
            <rect x="92" y="206" width="330" height="86" fill="#f2c53d" opacity="0.88" />
            <circle cx="618" cy="222" r={64 * gainScale} fill="#ffd84d" opacity="0.82" />
          </g>
          <g data-testid="black-layer" transform={`translate(${shift(settings.registration.blackX)} ${shift(settings.registration.blackY)})`}>
            <text x="78" y="342" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800" fill="#202124">
              CRISP FLEXO
            </text>
            <path d="M508 78h270M508 112h208M508 146h238M508 322h285" stroke="#202124" strokeWidth={6 * gainScale} strokeLinecap="round" />
            <g fill="none" stroke="#202124" strokeWidth="3">
              <circle cx="820" cy="76" r="18" />
              <line x1="802" y1="76" x2="838" y2="76" />
              <line x1="820" y1="58" x2="820" y2="94" />
            </g>
          </g>
        </g>
        <g data-testid="pinholes" opacity={String(outcome.defects.pinholes / 100)}>
          {Array.from({ length: 18 }).map((_, index) => (
            <circle
              key={index}
              cx={120 + ((index * 43) % 690)}
              cy={82 + ((index * 67) % 246)}
              r={3 + (index % 3)}
              fill="#fffdf8"
            />
          ))}
        </g>
        <g opacity={outcome.defects.dirtyPrint / 100}>
          <rect x="46" y="48" width="832" height="324" fill="#292521" opacity="0.12" />
          <path d="M80 58c180 48 420-18 762 34" stroke="#342a20" strokeWidth="18" opacity="0.2" fill="none" />
        </g>
        <g opacity={outcome.defects.edgeSquash / 100}>
          <rect x="62" y="62" width="320" height="170" fill="none" stroke="#1c1a18" strokeWidth="18" opacity="0.22" />
        </g>
      </svg>
    </section>
  );
}
