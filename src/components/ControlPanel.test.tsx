import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { ControlPanel } from "./ControlPanel";

function makeProps(overrides: Partial<Parameters<typeof ControlPanel>[0]> = {}) {
  return {
    job: starterJob,
    settings: createInitialSettings(starterJob),
    onSettingChange: vi.fn(),
    onAniloxPresetChange: vi.fn(),
    onRegistrationChange: vi.fn(),
    ...overrides,
  };
}

describe("ControlPanel — anilox dropdown", () => {
  it("renders a single anilox select instead of two sliders", () => {
    render(<ControlPanel {...makeProps()} />);

    expect(screen.getByLabelText("Anilox roll")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox volume")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox line screen")).not.toBeInTheDocument();
  });

  it("calls onAniloxPresetChange with matched volume and lineScreen when selection changes", () => {
    const onAniloxPresetChange = vi.fn();
    render(<ControlPanel {...makeProps({ onAniloxPresetChange })} />);

    fireEvent.change(screen.getByLabelText("Anilox roll"), {
      target: { value: "standard" },
    });

    expect(onAniloxPresetChange).toHaveBeenCalledWith(3.2, 1000);
  });
});

describe("ControlPanel — registration dpad", () => {
  it("renders color selector buttons and no registration sliders", () => {
    render(<ControlPanel {...makeProps()} />);

    expect(screen.getByRole("button", { name: /cyan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /magenta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yellow/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /black/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("cyanX")).not.toBeInTheDocument();
  });

  it("nudges selected color X by +0.1 when right arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));

    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanX",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanX + 0.1, 5),
    );
  });

  it("nudges selected color Y by -0.1 when up arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /up/i }));

    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanY",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanY - 0.1, 5),
    );
  });
});
