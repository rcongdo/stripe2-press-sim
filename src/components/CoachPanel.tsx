import { useLocale } from "../i18n/LocaleContext";
import type { CoachingMessage } from "../domain/types";

type CoachPanelProps = {
  messages: CoachingMessage[];
  mode: "guided" | "practice";
  onModeChange: (mode: "guided" | "practice") => void;
};

export function CoachPanel({ messages, mode, onModeChange }: CoachPanelProps) {
  const { t } = useLocale();

  return (
    <section className="coach-panel" aria-label="Coaching">
      <div className="coach-panel__header">
        <div>
          <p className="panel-label">{t.coach.title}</p>
          <h2>{mode === "guided" ? t.coach.guidedSetup : t.coach.practiceMode}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onModeChange(mode === "guided" ? "practice" : "guided")}
        >
          {mode === "guided" ? t.actions.practice : t.actions.showHints}
        </button>
      </div>
      {messages.length === 0 ? (
        <p className="quiet-copy">
          {mode === "practice" ? t.coach.noWarningsPractice : t.coach.noWarningsGuided}
        </p>
      ) : (
        <ul className="coaching-list">
          {messages.map((message) => (
            <li className={`coaching-message coaching-message--${message.level}`} key={message.id}>
              {t.coachingMessages[message.id] ?? message.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
