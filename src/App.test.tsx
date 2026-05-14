import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

// PdfUploadModal transitively imports pdfjs-dist with a ?url worker asset that
// cannot be resolved in the jsdom test environment. Mock the module so that
// App.test.tsx can import App without triggering the asset-URL resolution.
vi.mock("./pdf/extractLayers", () => ({
  extractLayers: vi.fn(),
}));

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

  it("job selector is present and shows both jobs", () => {
    render(<App />);
    const select = screen.getByRole("combobox", { name: /select job/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Snack Pouch Film/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Pressure-Sensitive Label/i })).toBeInTheDocument();
  });

  it("switching jobs resets settings", () => {
    render(<App />);
    const select = screen.getByRole("combobox", { name: /select job/i });
    fireEvent.change(select, { target: { value: "label-print" } });
    expect(screen.getByLabelText(/Press speed/i)).toHaveValue("580");
  });

  it("switches to press model tab when Press Model button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Press Model" }));
    expect(screen.getByTestId("press-overview")).toBeInTheDocument();
  });
});
