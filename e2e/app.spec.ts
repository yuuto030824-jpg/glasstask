import { expect, test } from "@playwright/test";
import { addTask, cardByTitle, devLogin, flick, logout, openApp } from "./helpers";

const uniq = (s: string) => `${s} ${Date.now().toString(36)}`;

test.describe("起動", () => {
  test("全画面スケルトンが出て、その間もメモ入力に即フォーカスされている", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    const skeleton = page.getByTestId("skeleton");
    const input = page.getByTestId("composer-input");

    await expect(skeleton).toBeVisible();
    await expect(input).toBeFocused();

    // Typing while the skeleton is still up must work.
    const title = uniq("スケルトン中に入力");
    await page.keyboard.type(title);
    await expect(input).toHaveValue(title);

    await expect(skeleton).toBeHidden({ timeout: 10_000 });
    await page.keyboard.press("Enter");
    await expect(cardByTitle(page, title)).toBeVisible();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("キャッチコピーなし: 画面上の文言は機能ラベルのみ", async ({ page }) => {
    await openApp(page);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    expect(text).toMatch(/GlassTask/);
    expect(text).not.toMatch(/ようこそ|始めよう|welcome|get started|生産性/i);
  });
});

test.describe("タスク操作（ゲスト）", () => {
  test("Enter で追加され Todo に表示・件数が更新される", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("count-todo")).toHaveText("0");
    const t1 = uniq("牛乳を買う");
    const t2 = uniq("レポートを書く");
    await addTask(page, t1);
    await addTask(page, t2);
    await expect(page.getByTestId("count-todo")).toHaveText("2");
    // Newest first
    const titles = await page.getByTestId("task-title").allInnerTexts();
    expect(titles[0]).toBe(t2);
    expect(titles[1]).toBe(t1);
  });

  test("右フリックで Todo → Doing → Done、左フリックで戻る", async ({ page }) => {
    await openApp(page);
    const title = uniq("フリック");
    await addTask(page, title);

    await flick(page, cardByTitle(page, title), 220);
    await expect(cardByTitle(page, title)).toBeHidden();
    await expect(page.getByTestId("count-doing")).toHaveText("1");

    await page.getByTestId("tab-doing").click();
    await expect(cardByTitle(page, title)).toBeVisible();
    await expect(cardByTitle(page, title)).toHaveAttribute("data-status", "doing");

    await flick(page, cardByTitle(page, title), 220);
    await expect(page.getByTestId("count-done")).toHaveText("1");
    await page.getByTestId("tab-done").click();
    await expect(cardByTitle(page, title)).toHaveAttribute("data-status", "done");

    await flick(page, cardByTitle(page, title), -220);
    await expect(page.getByTestId("count-doing")).toHaveText("1");
    await expect(page.getByTestId("count-done")).toHaveText("0");
  });

  test("Todo を左フリックすると削除され、元に戻すで復元できる", async ({ page }) => {
    await openApp(page);
    const title = uniq("削除");
    await addTask(page, title);
    await flick(page, cardByTitle(page, title), -220);
    await expect(cardByTitle(page, title)).toBeHidden();
    await expect(page.getByTestId("toast")).toContainText("削除しました");
    await page.getByTestId("toast-action").click();
    await expect(cardByTitle(page, title)).toBeVisible();
    await expect(page.getByTestId("count-todo")).toHaveText("1");
  });

  test("小さなドラッグではステータスが変わらない", async ({ page }) => {
    await openApp(page);
    const title = uniq("しきい値");
    await addTask(page, title);
    await flick(page, cardByTitle(page, title), 30);
    await expect(cardByTitle(page, title)).toBeVisible();
    await expect(page.getByTestId("count-todo")).toHaveText("1");
  });

  test("ゲストのタスクはリロード後も残る（localStorage）", async ({ page }) => {
    await openApp(page);
    const title = uniq("永続化");
    await addTask(page, title);
    await page.reload();
    await openApp(page);
    await expect(cardByTitle(page, title)).toBeVisible();
  });

  test("詳細シートでタイトル・ノート・ステータスを編集できる", async ({ page }) => {
    await openApp(page);
    const title = uniq("編集前");
    await addTask(page, title);
    await cardByTitle(page, title).click();
    const sheet = page.getByTestId("task-sheet");
    await expect(sheet).toBeVisible();

    const newTitle = uniq("編集後");
    await page.getByTestId("sheet-title").fill(newTitle);
    await page.getByTestId("sheet-note").fill("ノート本文");
    await page.getByTestId("sheet-status-doing").click();
    await page.getByTestId("sheet-backdrop").click({ position: { x: 10, y: 10 } });
    await expect(sheet).toBeHidden();

    await expect(page.getByTestId("count-doing")).toHaveText("1");
    await page.getByTestId("tab-doing").click();
    await expect(cardByTitle(page, newTitle)).toBeVisible();
    await expect(cardByTitle(page, newTitle)).toContainText("ノート本文");
  });

  test("AI ボタンは未ログインだとアカウントシートを開く", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("composer-input").fill("なにか");
    await page.getByTestId("ai-button").click();
    await expect(page.getByTestId("account-sheet")).toBeVisible();
    await expect(page.getByTestId("google-login")).toBeVisible();
  });
});

test.describe("ログインとクラウド同期", () => {
  test.afterEach(async ({ page }) => {
    const res = await page.request.get("/api/tasks");
    if (res.ok()) {
      const { tasks } = (await res.json()) as { tasks: { id: string }[] };
      for (const t of tasks) await page.request.delete(`/api/tasks/${t.id}`);
    }
  });

  test("ログインでゲストのタスクがクラウドへ移行し、リロード後も残り、ログアウトでゲストに戻る", async ({ page }) => {
    await openApp(page);
    const title = uniq("移行");
    await addTask(page, title);
    await expect(page.getByTestId("sync-dot")).toHaveAttribute("data-mode", "guest");

    await devLogin(page);
    await expect(cardByTitle(page, title)).toBeVisible();

    const res = await page.request.get("/api/tasks");
    expect(res.status()).toBe(200);
    const { tasks } = (await res.json()) as { tasks: { title: string }[] };
    expect(tasks.map((t) => t.title)).toContain(title);

    await page.reload();
    await openApp(page);
    await expect(page.getByTestId("sync-dot")).toHaveAttribute("data-mode", "cloud");
    await expect(cardByTitle(page, title)).toBeVisible();

    const cloudTitle = uniq("クラウド追加");
    await addTask(page, cloudTitle);
    await flick(page, cardByTitle(page, cloudTitle), 220);
    await expect.poll(async () => {
      const r = await page.request.get("/api/tasks");
      const body = (await r.json()) as { tasks: { title: string; status: string }[] };
      return body.tasks.find((t) => t.title === cloudTitle)?.status;
    }).toBe("doing");

    await logout(page);
    await expect(page.getByTestId("count-todo")).toHaveText("0");
    expect((await page.request.get("/api/tasks")).status()).toBe(401);
  });

  test("AI 提案シートが開き、適用するとタスクが追加される", async ({ page }) => {
    await openApp(page);
    await devLogin(page);
    const memo = uniq("来週のプレゼン準備");
    await page.getByTestId("composer-input").fill(memo);
    await page.getByTestId("ai-button").click();
    const sheet = page.getByTestId("ai-sheet");
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ai-source")).toHaveText(/Workers AI|オフライン/);
    const suggested = (await page.getByTestId("ai-title").innerText()).trim();
    expect(suggested.length).toBeGreaterThan(0);
    await page.getByTestId("ai-apply").click();
    await expect(sheet).toBeHidden();
    await expect(cardByTitle(page, suggested)).toBeVisible();
    await expect(page.getByTestId("composer-input")).toHaveValue("");
  });
});
