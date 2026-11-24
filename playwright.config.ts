import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3179";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3179",
    url: baseURL,
  },
});
