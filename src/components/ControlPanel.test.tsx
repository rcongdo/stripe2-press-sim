import { within, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { snackPouchJob } from "../domain/jobs";
import { activateSpotChannel, createInitialSettings } from "../domain/settings";
import { ControlPanel } from "./ControlPanel";

function makeProps(overrides: Partial<Parameters<typeof ControlPanel>[0]> = {}) {
  return {
    job: snackPouchJob,
    settings: createInitialSettings(snackPouchJob),
    mode: "guided" as const,
    onSettingChange: vi.fn(),
    onRegistrationChange: vi.fn(),
    onInkChannelChange: vi.fn(),
    onSpotChannelToggle: vi.fn(),
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
      "C",
      expect.objectContaining({ x: expect.closeTo(createInitialSettings(snackPouchJob).registration.C.x + 0.1, 5) }),
    );
  });

  it("nudges selected color Y by -0.1 when up arrow is clicked", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /cyan/i }));
    fireEvent.click(screen.getByRole("button", { name: /up/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "C",
      expect.objectContaining({ y: expect.closeTo(createInitialSettings(snackPouchJob).registration.C.y - 0.1, 5) }),
    );
  });

  it("routes nudge to the correct key when a non-default color is selected", () => {
    const onRegistrationChange = vi.fn();
    render(<ControlPanel {...makeProps({ onRegistrationChange })} />);
    const inkGroup = screen.getByRole("group", { name: "Ink color" });
    fireEvent.click(within(inkGroup).getByRole("button", { name: /magenta/i }));
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith(
      "M",
      expect.objectContaining({ x: expect.closeTo(createInitialSettings(snackPouchJob).registration.M.x + 0.1, 5) }),
    );
  });

  it("clamps registration nudge at ±4 mil", () => {
    const onRegistrationChange = vi.fn();
    render(
      <ControlPanel
        {...makeProps({
          settings: {
            ...createInitialSettings(snackPouchJob),
            registration: { ...createInitialSettings(snackPouchJob).registration, C: { x: 4, y: 0 } },
          },
          onRegistrationChange,
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /right/i }));
    expect(onRegistrationChange).toHaveBeenCalledWith("C", expect.objectContaining({ x: 4 }));
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

describe("ControlPanel — spot channels", () => {
  it("shows Add buttons for inactive spot channels", () => {
    render(<ControlPanel {...makeProps()} />);
    expect(screen.getByRole("button", { name: /add pantone 021 orange/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add metallic silver/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add opaque white/i })).toBeInTheDocument();
  });

  it("calls onSpotChannelToggle(channelId, true) when Add is clicked", () => {
    const onSpotChannelToggle = vi.fn();
    render(<ControlPanel {...makeProps({ onSpotChannelToggle })} />);
    fireEvent.click(screen.getByRole("button", { name: /add pantone 021 orange/i }));
    expect(onSpotChannelToggle).toHaveBeenCalledWith("orange", true);
  });

  it("shows Remove button for an active spot channel", () => {
    const settings = activateSpotChannel(snackPouchJob, createInitialSettings(snackPouchJob), "orange");
    render(<ControlPanel {...makeProps({ settings })} />);
    expect(screen.getByRole("button", { name: /remove pantone 021 orange/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add pantone 021 orange/i })).not.toBeInTheDocument();
  });

  it("calls onSpotChannelToggle(channelId, false) when Remove is clicked", () => {
    const onSpotChannelToggle = vi.fn();
    const settings = activateSpotChannel(snackPouchJob, createInitialSettings(snackPouchJob), "orange");
    render(<ControlPanel {...makeProps({ settings, onSpotChannelToggle })} />);
    fireEvent.click(screen.getByRole("button", { name: /remove pantone 021 orange/i }));
    expect(onSpotChannelToggle).toHaveBeenCalledWith("orange", false);
  });
});
