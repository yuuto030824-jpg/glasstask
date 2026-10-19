import { expect, type Locator, type Page } from "@playwright/test";

export async function openApp(page: Page) {
  await page.goto("/");
  // Full-screen skeleton must be visible immediately…
  await expect(page.getByTestId("skeleton")).toBeVisible();
  // …then fade out once the data is ready.
  await expect(page.getByTestId("skeleton")).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId("app")).toHaveAttribute("data-ready", "true");
}

export async function addTask(page: Page, title: string) {
  const input = page.getByTestId("composer-input");
  await input.fill(title);
  await input.press("Enter");
  await expect(page.getByTestId("task-title").filter({ hasText: title }).first()).toBeVisible();
}

/** Flick a card horizontally. Positive dx = right, negative = left. */
export async function flick(page: Page, card: Locator, dx: number) {
  const box = await card.boundingBox();
  if (!box) throw new Error("card not visible");
  const startX = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, y);
  }
  await page.mouse.up();
}

export function cardByTitle(page: Page, title: string) {
  return page.getByTestId("task-card").filter({ has: page.getByTestId("task-title").filter({ hasText: title }) });
}

export async function devLogin(page: Page) {
  await page.getByTestId("account-button").click();
  await page.getByTestId("dev-login").click();
  await expect(page.getByTestId("sync-dot")).toHaveAttribute("data-mode", "cloud", { timeout: 10_000 });
  await expect(page.getByTestId("account-sheet")).toBeHidden();
}

export async function logout(page: Page) {
  await page.getByTestId("account-button").click();
  await page.getByTestId("logout-button").click();
  await expect(page.getByTestId("sync-dot")).toHaveAttribute("data-mode", "guest");
}
