import type { ChannelId } from "../domain/types";

export function mapColorantNameToChannelId(name: string): ChannelId | "ignore" {
  const n = name.toLowerCase().trim();
  if (n === "c" || n.includes("cyan"))                        return "C";
  if (n === "m" || n.includes("magenta"))                     return "M";
  if (n === "y" || n.includes("yellow"))                      return "Y";
  if (n === "k" || n.includes("black") || n.includes("key")) return "K";
  if (n.includes("orange"))                                   return "orange";
  if (n.includes("silver") || n.includes("metallic"))        return "silver";
  if (n.includes("white") || n.includes("opaque"))           return "white";
  return "ignore";
}

export function autoMapColorants(
  colorantNames: string[],
): Record<string, ChannelId | "ignore"> {
  return Object.fromEntries(
    colorantNames.map(name => [name, mapColorantNameToChannelId(name)]),
  );
}
