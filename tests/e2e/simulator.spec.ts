import { expect, test } from "@playwright/test";

test("operator can adjust settings, switch to practice, and finish a run", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Flexographic Press Simulator" })).toBeVisible();
  await expect(page.getByLabel("Live print sample")).toBeVisible();

  const metricsStrip = page.getByLabel("Live press metrics");
  const initialQuality = await metricsStrip.getByText("Setup quality").locator("..").locator("strong").textContent();
  await page.getByLabel(/Impression/i).evaluate((el) => {
    const input = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(input, "92");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const changedQuality = await metricsStrip.getByText("Setup quality").locator("..").locator("strong").textContent();
  expect(changedQuality).not.toBe(initialQuality);

  await page.getByRole("button", { name: "Practice" }).click();
  await expect(page.getByText("Practice mode")).toBeVisible();

  await page.getByRole("button", { name: "Finish run" }).click();
  await expect(page.getByRole("dialog", { name: /Run summary/i })).toBeVisible();
});
