import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("updates metrics when the learner changes press speed", async () => {
    render(<App />);

    const qualityBefore = screen.getByText("Setup quality").nextElementSibling?.textContent;
    const pressSpeed = screen.getByLabelText(/Press speed/i);
    fireEvent.change(pressSpeed, { target: { value: "500" } });

    expect(screen.getByText("Setup quality").nextElementSibling?.textContent).not.toBe(qualityBefore);
  });

  it("toggles coaching into practice mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Practice" }));

    expect(screen.getByText("Practice mode")).toBeInTheDocument();
    expect(screen.getByText(/Hints are hidden/i)).toBeInTheDocument();
  });

  it("shows a score summary when the learner finishes the run", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Finish run" }));

    expect(screen.getByRole("dialog", { name: /Run summary/i })).toBeInTheDocument();
  });
});
