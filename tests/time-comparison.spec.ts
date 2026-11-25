import { expect, test } from "@playwright/test";

test("不知道時辰時可選兩盤、篩選差異並開啟指定命盤", async ({ page }) => {
  await page.goto("/");
  await page.getByText("女", { exact: true }).first().click();
  await page.getByText("不知道", { exact: true }).click();
  await page.getByRole("button", { name: "列出各時辰命盤" }).click();
  const compare = page.getByRole("region", { name: "候選時辰對照" });
  await compare.getByLabel("第一個時辰").selectOption("4");
  await compare.getByLabel("第二個時辰").selectOption("5");
  await expect(compare.getByLabel("第二個時辰").getByRole("option", { name: /^辰時/ })).toHaveJSProperty("disabled", true);
  await expect(compare.getByRole("row", { name: /命宮主星/ })).toHaveText("命宮主星太陽、天梁武曲、天相");
  await expect(compare.getByRole("row", { name: /五行局/ })).toHaveText("五行局金四局金四局");
  await compare.getByLabel("只看不同項目").check();
  await expect(compare.getByRole("row", { name: /五行局/ })).toHaveCount(0);
  await expect(compare.getByRole("row", { name: /生年化科/ })).toHaveText("生年化科天梁入命宮天梁入父母宮");
  expect(await compare.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await compare.getByRole("button", { name: "查看巳時命盤" }).click();
  await expect(page.getByRole("heading", { name: "你的命盤" })).toBeVisible();
  await page.getByText("生辰資料與顯示偏好", { exact: true }).click();
  await expect(page.getByText(/民國79年.*巳時/)).toBeVisible();
});

test("除夕的晚子時跨年換四化，分享可重開所選候選盤", async ({ page }) => {
  // 既有格式的分享連結也必須能重開，台北除夕 22:50 的相鄰時辰為隔日子時。
  await page.goto("/method#boundary");
  const example = page.getByRole("link", { name: "打開除夕範例命盤" });
  await expect(example).toHaveAttribute("href", "/#c=1.f.s.2024.2.9.0.11.c.2250.taipei.0");
  await example.click();
  const boundary = page.getByRole("region", { name: "出生時間交界" });
  await expect(boundary).toContainText("目前顯示亥時命盤");
  await boundary.getByText("比對兩個時辰的盤面").click();
  await expect(boundary.getByRole("row", { name: /排盤國曆/ })).toHaveText("排盤國曆2024-2-92024-2-10");
  await expect(boundary.getByRole("row", { name: /排盤農曆/ })).toHaveText("排盤農曆二〇二三年臘月三十二〇二四年正月初一");
  await expect(boundary.getByRole("row", { name: /生年化祿/ })).toHaveText("生年化祿破軍入財帛宮廉貞入兄弟宮");
  await expect(boundary.getByRole("row", { name: /命宮主星/ })).toContainText("空宮，借遷移宮的天機、太陰");
  await boundary.getByRole("button", { name: "改看子時命盤" }).click();
  await expect(boundary).toContainText("目前顯示子時命盤");
  await page.getByRole("button", { name: "分享", exact: true }).click();
  const lineLink = await page.getByRole("link", { name: "傳到 LINE" }).getAttribute("href");
  const params = new URL(lineLink!).searchParams;
  const shared = params.get("url") ?? params.get("text")!.split(" ").at(-1)!;
  expect(shared).toContain("&v=alt");
  await page.goto(shared);
  await expect(boundary).toContainText("目前顯示子時命盤");
  await boundary.getByText("比對兩個時辰的盤面").click();
  await expect(boundary.getByRole("row", { name: /生年化祿/ })).toHaveText("生年化祿破軍入財帛宮廉貞入兄弟宮");
});

test("夏令時間回撥的重複鐘點保留兩種排法", async ({ page }) => {
  await page.goto("/#c=1.f.s.2024.11.3.0.1.c.0130.newyork.0");
  const boundary = page.getByRole("region", { name: "出生時間交界" });
  await boundary.getByText("比對兩個時辰的盤面").click();
  await expect(boundary).toContainText("01:30 這個鐘點出現了兩次");
  await expect(boundary.getByRole("columnheader", { name: "子時" })).toBeVisible();
  await expect(boundary.getByRole("columnheader", { name: "丑時" })).toBeVisible();
});
