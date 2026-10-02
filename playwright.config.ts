import { defineConfig } from "@playwright/test";
export default defineConfig({
  workers: 1,
  timeout: 90000,
  reporter: "list",
  outputDir: ".runtime/playwright-results",
  projects: [
    { name: "desktop", testDir: "./desktop/tests" },
    {
      name: "mobile-web",
      testDir: "./mobile/tests",
      use: {
        browserName: "chromium",
        channel: "chrome",
        baseURL: "http://localhost:5173",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
