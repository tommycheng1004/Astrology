import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // 民國 87 年 10 月 4 日 09:30 男（農曆戊寅年，屬虎）存進「我的命盤」後回到首頁
  await page.goto("/#c=1.m.s.1998.10.4.0.5.c.0930.taipei.0");
  await page.getByRole("button", { name: "存到我的命盤" }).click();
  await page.goto("/");
});

test("回訪首頁先看到自己的命盤、今年與下一步", async ({ page }) => {
  await expect(page.getByText(/^我的命盤・民國87年10月4日・09:30・男$/)).toBeVisible();
  await expect(page.getByText("命宮的主星是巨門")).toBeVisible();
  await expect(page.getByRole("button", { name: /^打開我的命盤/ })).toBeVisible();
  const year = page.getByRole("region", { name: "你的 2027 丁未年" });
  await expect(year).toContainText("屬虎：2027 年沒有犯太歲。");
  // 給所有人看的通用流年入口不再重複出現
  await expect(page.getByRole("link", { name: /2027 犯太歲生肖/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^未命名.*打開/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^未命名/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const [label, tab] of [["擇日", /擇日/], ["合盤", /合盤/], ["看 2027 每月運勢", /運勢/], ["看今天運勢", /運勢/]] as const) {
  test(`首頁「${label}」直接打開對應分頁`, async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
    await expect(page.getByRole("tab", { name: tab, selected: true }).first()).toBeVisible();
  });
}
