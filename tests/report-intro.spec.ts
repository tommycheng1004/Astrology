import { expect, test } from "@playwright/test";

test("訪客直接打開報告網址時，先看到報告內容與免費註冊入口", async ({ page }) => {
  await page.goto("/report/report-2027?record=whatever");
  await expect(page.getByRole("heading", { level: 1, name: "2027 流年報告" })).toBeVisible();
  test.skip(await page.getByText("會員功能尚未設定。").isVisible(), "這次建置沒有設定 Firebase");
  const intro = page.getByRole("region", { name: "報告內容" });
  await expect(intro.getByText("十項流年運勢")).toBeVisible();
  await expect(intro.getByText("全年擇日")).toBeVisible();
  await expect(intro.getByRole("button", { name: "免費註冊／登入後閱讀" })).toBeVisible();
  await expect(intro.getByRole("link", { name: /先免費排盤/ })).toHaveAttribute("href", "/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // 登入按鈕要能打開登入框
  await intro.getByRole("button", { name: "免費註冊／登入後閱讀" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("每種報告的標題與介紹各自不同", async ({ page }) => {
  await page.goto("/report/deep");
  await expect(page.getByRole("heading", { level: 1, name: "深度解盤" })).toBeVisible();
  await expect(page).toHaveTitle(/^深度解盤｜/);
  await page.goto("/report/monthly");
  await expect(page.getByRole("heading", { level: 1, name: "流月報告" })).toBeVisible();
});
