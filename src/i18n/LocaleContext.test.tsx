import { render, screen, fireEvent, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "./LocaleContext";

function LangDisplay() {
  const { t, lang, setLang } = useLocale();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t.appTitle}</span>
      <button onClick={() => setLang("es")}>Switch to Spanish</button>
      <button onClick={() => setLang("en")}>Switch to English</button>
    </div>
  );
}

describe("LocaleContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to English when localStorage is empty", () => {
    render(<LocaleProvider><LangDisplay /></LocaleProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("title").textContent).toBe("Flexographic Press Simulator");
  });

  it("loads saved language from localStorage on mount", () => {
    localStorage.setItem("flexo-sim-lang", "es");
    render(<LocaleProvider><LangDisplay /></LocaleProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("es");
    expect(screen.getByTestId("title").textContent).toBe("Simulador de Prensa Flexográfica");
  });

  it("persists language change to localStorage", () => {
    render(<LocaleProvider><LangDisplay /></LocaleProvider>);
    fireEvent.click(screen.getByText("Switch to Spanish"));
    expect(localStorage.getItem("flexo-sim-lang")).toBe("es");
    expect(screen.getByTestId("lang").textContent).toBe("es");
    expect(screen.getByTestId("title").textContent).toBe("Simulador de Prensa Flexográfica");
  });

  it("switches back to English", () => {
    localStorage.setItem("flexo-sim-lang", "es");
    render(<LocaleProvider><LangDisplay /></LocaleProvider>);
    fireEvent.click(screen.getByText("Switch to English"));
    expect(localStorage.getItem("flexo-sim-lang")).toBe("en");
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("throws when useLocale is used outside LocaleProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<LangDisplay />)).toThrow("useLocale must be used inside LocaleProvider");
    console.error = originalError;
  });
});
