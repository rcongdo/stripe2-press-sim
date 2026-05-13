import { within, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { starterJob } from "../domain/jobs";
import { createInitialSettings } from "../domain/settings";
import { ControlPanel } from "./ControlPanel";

function makeProps(overrides: Partial<Parameters<typeof ControlPanel>[0]> = {}) {
  return {
    job: starterJob,
    settings: createInitialSettings(starterJob),
    onSettingChange: vi.fn(),
    onRegistrationChange: vi.fn(),
    onInkChannelChange: vi.fn(),
    ...overrides,
  };
}

describe("ControlPanel — anilox dropdown", () => {
  it("renders an anilox roll select in the ink section", () => {
    render(<ControlPanel {...makeProps()} />);
    expect(screen.getByLabelText("Anilox roll")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox volume")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Anilox line screen")).not.toBeInTheDocument();
  });

  it("calls onInkChannelChange with channel C and aniloxVolume when selection changes", () => {
    const onInkChannelChange = vi.fn();
    render(<ControlPanel {...makeProps({ onInkChannelChange })} />);
    fireEvent.change(screen.getByLabelText("Anilox roll"), {
      target: { value: "standard" },
    });
    expect(onInkChannelChange).toHaveBeenCalledWith("C", "aniloxVolume", 3.2);
  });
});

describe("ControlPanel — registration dpad", () => {
  it("renders a single color selector group with dpad buttons and no separate registration sliders", () => {
    render(<ControlPanel {...makeProps()} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    expect(within(inkGroup).getByRole("button", { name: /cyan/i })).toBeInTheDocument();
    expect(within(inkGroup).getByRole("button", { name: /magenta/i })).toBeInTheDocument();
    expect(within(inkGroup).getByRole("button", { name: /yellow/i })).toBeInTheDocument();
    expect(within(inkGroup).getByRole("button", { name: /black/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("cyanX")).not.toBeInTheDocument();
  });

  it("nudges selected color X by +0.1 when right arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanX",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanX + 0.1, 5),
    );
  });

  it("nudges selected color Y by -0.1 when up arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /up/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "cyanY",
      expect.closeTo(createInitialSettings(starterJob).registration.cyanY - 0.1, 5),
    );
  });

  it("routes nudge to the correct key when a non-default color is selected", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /magenta/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "magentaX",
      expect.closeTo(createInitialSettings(starterJob).registration.magentaX + 0.1, 5),
    );
  });

  it("clamps registration nudge at ±4 mil", () => {
    const onRegistrationChange = vi.fn();
    render(
      <ControlPanel
        {...makeProps({
          settings: {
            ...createInitialSettings(starterJob),
            registration: { ...createInitialSettings(starterJob).registration, cyanX: 4 },
          },
          onRegistrationChange,
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith("cyanX", 4);
  });
});

describe("ControlPanel — ink sliders", () => {
  it("renders sliders for viscosity, strength, and impression", () => {
    render(<ControlPanel {...makeProps()} />);
    expect(screen.getByRole("slider", { name: /viscosity/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /strength/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /impression/i })).toBeInTheDocument();
  });

  it("fires onInkChannelChange with channel C and correct key on slider change", () => {
    const onInkChannelChange = vi.fn();
    render(<ControlPanel {...makeProps({ onInkChannelChange })} />);
    fireEvent.change(screen.getByRole("slider", { name: /viscosity/i }), {
      target: { value: "35" },
    });
    expect(onInkChannelChange).toHaveBeenCalledWith("C", "viscosity", 35);
  });

  it("switching color changes the channel fired by onInkChannelChange", () => {
    const onInkChannelChange = vi.fn();
    render(<ControlPanel {...makeProps({ onInkChannelChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /magenta/i }));
    fireEvent.change(screen.getByRole("slider", { name: /impression/i }), {
      target: { value: "60" },
    });
    expect(onInkChannelChange).toHaveBeenCalledWith("M", "impression", 60);
  });
});
