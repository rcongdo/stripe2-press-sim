import type { ScoreSummary } from "../domain/types";
import type { Locale } from "../i18n/types";
import { useLocale } from "../i18n/LocaleContext";

type ScoreModalProps = {
  score: ScoreSummary | null;
  onClose: () => void;
  onReset: () => void;
};

function localizedGrade(grade: ScoreSummary["grade"], t: Locale): string {
  if (grade === "Press ready") return t.score.grades.pressReady;
  if (grade === "Getting close") return t.score.grades.gettingClose;
  return t.score.grades.needsWork;
}

export function ScoreModal({ score, onClose, onReset }: ScoreModalProps) {
  const { t } = useLocale();

  if (!score) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
        <p className="panel-label">{t.score.runSummary}</p>
        <h2 id="score-title">{t.score.runSummary}: {localizedGrade(score.grade, t)}</h2>
        <div className="score-total">{score.totalScore}</div>
        <div className="score-grid">
          <span>{t.score.quality}</span>
          <strong>{score.qualityScore}</strong>
          <span>{t.score.waste}</span>
          <strong>{score.wasteScore}</strong>
          <span>{t.score.stability}</span>
          <strong>{score.stabilityScore}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            {t.actions.continueTuning}
          </button>
          <button type="button" className="primary-button" onClick={onReset}>
            {t.actions.resetJob}
          </button>
        </div>
      </section>
    </div>
  );
}
