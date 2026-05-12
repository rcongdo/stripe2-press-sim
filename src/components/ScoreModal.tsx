import type { ScoreSummary } from "../domain/types";

type ScoreModalProps = {
  score: ScoreSummary | null;
  onClose: () => void;
  onReset: () => void;
};

export function ScoreModal({ score, onClose, onReset }: ScoreModalProps) {
  if (!score) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
        <p className="panel-label">Run summary</p>
        <h2 id="score-title">Run summary: {score.grade}</h2>
        <div className="score-total">{score.totalScore}</div>
        <div className="score-grid">
          <span>Quality</span>
          <strong>{score.qualityScore}</strong>
          <span>Waste</span>
          <strong>{score.wasteScore}</strong>
          <span>Stability</span>
          <strong>{score.stabilityScore}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Continue tuning
          </button>
          <button type="button" className="primary-button" onClick={onReset}>
            Reset job
          </button>
        </div>
      </section>
    </div>
  );
}
