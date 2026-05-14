import { describe, expect, it } from "vitest";
import { autoMapColorants, mapColorantNameToChannelId } from "./autoMapper";

describe("mapColorantNameToChannelId", () => {
  it.each([
    ["C",        "C"],
    ["Cyan",     "C"],
    ["cyan",     "C"],
    ["M",        "M"],
    ["Magenta",  "M"],
    ["magenta",  "M"],
    ["Y",        "Y"],
    ["Yellow",   "Y"],
    ["yellow",   "Y"],
    ["K",        "K"],
    ["Black",    "K"],
    ["black",    "K"],
    ["Key",      "K"],
    ["key",      "K"],
    ["orange",   "orange"],
    ["Orange",   "orange"],
    ["silver",   "silver"],
    ["Silver",   "silver"],
    ["metallic", "silver"],
    ["Metallic", "silver"],
    ["white",    "white"],
    ["White",    "white"],
    ["opaque",   "white"],
    ["Opaque white", "white"],
  ])('maps "%s" → "%s"', (input, expected) => {
    expect(mapColorantNameToChannelId(input)).toBe(expected);
  });

  it('returns "ignore" for unrecognised names', () => {
    expect(mapColorantNameToChannelId("Spot UV")).toBe("ignore");
    expect(mapColorantNameToChannelId("PANTONE 485 C")).toBe("ignore");
    expect(mapColorantNameToChannelId("")).toBe("ignore");
  });
});

describe("autoMapColorants", () => {
  it("maps an array of colorant names to a channel-id record", () => {
    const result = autoMapColorants(["Cyan", "Magenta", "Yellow", "Black", "Spot UV"]);
    expect(result).toEqual({
      Cyan:     "C",
      Magenta:  "M",
      Yellow:   "Y",
      Black:    "K",
      "Spot UV": "ignore",
    });
  });

  it("returns an empty object for an empty array", () => {
    expect(autoMapColorants([])).toEqual({});
  });
});
