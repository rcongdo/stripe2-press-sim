import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../i18n/LocaleContext";
import { CoachPanel } from "./CoachPanel";

function makeProps(overrides = {}) {
  return {
    messages: [],
    mode: "guided" as const,
    onModeChange: vi.fn(),
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("CoachPanel", () => {
  it("shows 'Coaching' title and 'Guided setup' in guided mode", () => {
    wrap(<CoachPanel {...makeProps()} />);
    expect(screen.getByText("Coaching")).toBeInTheDocument();
    expect(screen.getByText("Guided setup")).toBeInTheDocument();
  });

  it("shows 'Practice mode' heading in practice mode", () => {
    wrap(<CoachPanel {...makeProps({ mode: "practice" })} />);
    expect(screen.getByText("Practice mode")).toBeInTheDocument();
  });

  it("shows 'Practice' button in guided mode", () => {
    wrap(<CoachPanel {...makeProps()} />);
    expect(screen.getByRole("button", { name: "Practice" })).toBeInTheDocument();
  });

  it("shows 'Show hints' button in practice mode", () => {
    wrap(<CoachPanel {...makeProps({ mode: "practice" })} />);
    expect(screen.getByRole("button", { name: "Show hints" })).toBeInTheDocument();
  });

  it("shows no-warnings message when messages list is empty in guided mode", () => {
    wrap(<CoachPanel {...makeProps()} />);
    expect(screen.getByText(/No active warnings/)).toBeInTheDocument();
  });

  it("shows no-warnings message in practice mode", () => {
    wrap(<CoachPanel {...makeProps({ mode: "practice" })} />);
    expect(screen.getByText(/Hints are hidden/)).toBeInTheDocument();
  });

  it("renders coaching message text via locale lookup by id", () => {
    const messages = [
      { id: "impression-heavy" as const, level: "warning" as const, text: "fallback text not shown" },
    ];
    wrap(<CoachPanel {...makeProps({ messages })} />);
    expect(screen.getByText("Impression is heavy; watch for gain, dirty print, and edge squash.")).toBeInTheDocument();
    expect(screen.queryByText("fallback text not shown")).not.toBeInTheDocument();
  });
});
