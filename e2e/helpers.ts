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

/** Wait until an element's bounding box stops moving (layout/enter animations settled). */
async function settledBox(locator: Locator) {
  let prev = await locator.boundingBox();
  for (let i = 0; i < 40; i++) {
    await locator.page().waitForTimeout(60);
    const next = await locator.boundingBox();
    if (prev && next && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && Math.abs(prev.height - next.height) < 0.5) {
      return next;
    }
    prev = next;
  }
  return prev;
}

/** Flick a card horizontally. Positive dx = right, negative = left.
 *  Retries when the gesture was not registered (slow CI runners can drop pointer samples). */
export async function flick(page: Page, card: Locator, dx: number, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const box = await settledBox(card);
    if (!box) throw new Error("card not visible");
    const before = await card.getAttribute("data-status");
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(startX + (dx * i) / steps, y);
      await page.waitForTimeout(12);
    }
    await page.waitForTimeout(40);
    await page.mouse.up();

    // A small drag is expected to do nothing; don't retry it.
    if (Math.abs(dx) < 60) return;
    try {
      await expect
        .poll(async () => ((await card.count()) === 0 ? null : await card.getAttribute("data-status")), { timeout: 2500 })
        .not.toBe(before);
      return;
    } catch {
      if (attempt === attempts - 1) throw new Error(`flick(${dx}) was not registered after ${attempts} attempts`);
    }
  }
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
