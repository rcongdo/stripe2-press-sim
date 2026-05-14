import { describe, expect, it } from "vitest";
import { autoMapLayers, mapLayerNameToChannelId } from "./autoMapper";

describe("mapLayerNameToChannelId", () => {
  it.each([
    ["Cyan",                "C"],
    ["CYAN",                "C"],
    ["c",                   "C"],
    ["C",                   "C"],
    ["Magenta",             "M"],
    ["m",                   "M"],
    ["Yellow",              "Y"],
    ["y",                   "Y"],
    ["Black",               "K"],
    ["key",                 "K"],
    ["k",                   "K"],
    ["CMYK Black",          "K"],
    ["Pantone 021 Orange",  "orange"],
    ["Metallic Silver",     "silver"],
    ["silver",              "silver"],
    ["Opaque White",        "white"],
    ["white",               "white"],
    ["Spot UV",             "ignore"],
    ["Logo",                "ignore"],
    ["",                    "ignore"],
  ])('maps "%s" to "%s"', (name, expected) => {
    expect(mapLayerNameToChannelId(name)).toBe(expected);
  });
});

describe("autoMapLayers", () => {
  it("maps a list of layer names to channel IDs", () => {
    const result = autoMapLayers(["Cyan", "Magenta", "Yellow", "Black", "Spot UV"]);
    expect(result).toEqual({
      Cyan: "C",
      Magenta: "M",
      Yellow: "Y",
      Black: "K",
      "Spot UV": "ignore",
    });
  });

  it("returns empty object for empty input", () => {
    expect(autoMapLayers([])).toEqual({});
  });
});
