export type EducationEntry = { name: string; description: string };

export const PRESS_EDUCATION: Record<string, EducationEntry> = {
  ciDrum: {
    name: "Central Impression Drum",
    description:
      "A large precision-machined steel cylinder that all print stations print against. The web wraps around it so every color prints on a perfectly supported surface with the same impression reference — the key advantage of CI presses over in-line stack designs.",
  },
  aniloxRoll: {
    name: "Anilox Roll",
    description:
      "An engraved ceramic or chrome roller covered in billions of tiny cells. Each cell holds a precise volume of ink measured in BCM (billion cubic microns per square inch) and transfers it to the plate. The anilox is the primary control over how much ink reaches the substrate.",
  },
  doctorBlade: {
    name: "Doctor Blade",
    description:
      "A thin steel or polymer blade pressed against the anilox roll at a trailing angle. It wipes excess ink from the roll surface, leaving only the ink held inside the engraved cells. Blade material, angle, and contact pressure all affect metering precision.",
  },
  containmentBlade: {
    name: "Containment Blade",
    description:
      "The leading blade of the chambered ink system. It seals the front of the ink chamber against the anilox roll to prevent ink from escaping. Together with the doctor blade it forms the fully enclosed ink reservoir.",
  },
  inkChamber: {
    name: "Ink Chamber",
    description:
      "An enclosed reservoir that delivers ink to the anilox roll under controlled pressure. Ink is continuously pumped in and recirculated to maintain consistent viscosity and temperature. Chambered systems reduce ink waste and solvent evaporation compared to open ink pans.",
  },
  plateCylinder: {
    name: "Plate Cylinder",
    description:
      "Carries the photopolymer printing plate. Raised image areas on the plate pick up ink from the anilox and transfer it to the substrate at the nip point with the CI drum. Plate-to-substrate impression is a critical setting: too light gives weak transfer, too heavy causes dot gain and accelerated plate wear.",
  },
  web: {
    name: "Web (Substrate)",
    description:
      "The continuous roll of film, foil, or paper being printed. On a CI press the web wraps tightly around the central drum so each colour station prints on a dimensionally stable, well-supported surface, giving CI presses exceptional registration across all colours.",
  },
  inlinePress: {
    name: "Inline Narrow-Web Press",
    description:
      "Stations are arranged in a horizontal line and each has its own impression cylinder. The web threads through each station sequentially rather than wrapping around a shared central drum. Registration errors can accumulate from station to station, making precise mechanical setup more critical than on a CI press.",
  },
  impressionCylinder: {
    name: "Impression Cylinder",
    description:
      "On an inline press each station has its own impression cylinder that backs the substrate at the print nip. Impression pressure is set independently per station, giving more flexibility but requiring individual calibration.",
  },
  fountainRoll: {
    name: "Fountain Roll",
    description:
      "A rubber-covered roller that rotates partially submerged in the ink pan. It picks up a film of ink and transfers it to the anilox roll. Fountain roll speed relative to the anilox affects how much ink is supplied to the system.",
  },
  interStationDryer: {
    name: "Inter-station Dryer / UV Lamp",
    description:
      "On an inline press the web passes through a drying or curing unit between each print station. This allows ink to set before the next colour is applied, reducing trapping issues and enabling reverse printing on clear film. UV lamps cure ink instantly with no heat; hot-air dryers evaporate solvent or water.",
  },
};
