import type { CoachingMessage } from "../domain/types";

type CoachPanelProps = {
  messages: CoachingMessage[];
  mode: "guided" | "practice";
  onModeChange: (mode: "guided" | "practice") => void;
};

export function CoachPanel({ messages, mode, onModeChange }: CoachPanelProps) {
  return (
    <section className="coach-panel" aria-label="Coaching">
      <div className="coach-panel__header">
        <div>
          <p className="panel-label">Coaching</p>
          <h2>{mode === "guided" ? "Guided setup" : "Practice mode"}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onModeChange(mode === "guided" ? "practice" : "guided")}
        >
          {mode === "guided" ? "Practice" : "Show hints"}
        </button>
      </div>
      {messages.length === 0 ? (
        <p className="quiet-copy">
          {mode === "practice"
            ? "Hints are hidden. Metrics and print behavior still update."
            : "No active warnings. Keep tuning toward the target window."}
        </p>
      ) : (
        <ul className="coaching-list">
          {messages.map((message) => (
            <li className={`coaching-message coaching-message--${message.level}`} key={message.id}>
              {message.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
