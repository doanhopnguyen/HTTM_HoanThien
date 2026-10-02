import { test, expect, _electron } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test("Electron control center receives real AI events and staff updates", async ({
  request,
}) => {
  const envFile = readFileSync(".env", "utf8");
  const setting = (name: string) =>
    envFile
      .split(/\r?\n/)
      .find((line) => line.startsWith(name + "="))
      ?.slice(name.length + 1) || "";
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:8080";
  const dataDir = path.resolve(".runtime/electron-e2e");
  mkdirSync(dataDir, { recursive: true });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[0] !== "ELECTRON_RUN_AS_NODE",
    ),
  );
  const app = await _electron.launch({
    args: [path.resolve("desktop")],
    env: { ...env, API_BASE_URL: baseUrl, POOL_SAFETY_USER_DATA: dataDir },
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.getByLabel("Username", { exact: true }).fill("admin");
    await page
      .getByLabel("Password", { exact: true })
      .fill(setting("DEV_PASSWORD"));
    await page.getByRole("checkbox").uncheck();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Realtime connected", { exact: true }),
    ).toBeVisible();
    await page
      .locator("nav")
      .getByRole("link", { name: "Cameras", exact: true })
      .click();
    await page.getByRole("button", { name: "Add camera", exact: true }).click();
    const code = `E2E-${Date.now()}`;
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByLabel("Name", { exact: true }).fill("E2E Deep Water");
    await page.getByLabel("Location", { exact: true }).fill("North end");
    await page.getByLabel("Status", { exact: true }).selectOption("ONLINE");
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    const adminLogin = await request.post(`${baseUrl}/api/auth/login`, {
      data: { username: "admin", password: setting("DEV_PASSWORD") },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const admin = await adminLogin.json();
    const cameras = await (
      await request.get(`${baseUrl}/api/cameras?size=100`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      })
    ).json();
    const camera = cameras.content.find(
      (camera: { code: string }) => camera.code === code,
    );
    const result = await request.post(`${baseUrl}/api/detection-events`, {
      headers: { "X-AI-SERVICE-KEY": setting("AI_SERVICE_KEY") },
      data: {
        cameraId: camera.id,
        eventType: "DROWNING",
        confidence: 0.94,
        detectedAt: new Date(Date.now() - 1000).toISOString(),
      },
    });
    expect(result.status()).toBe(201);
    const created = await result.json();
    await expect(page.locator(".critical-alert")).toBeVisible();
    await expect(page.locator(".critical-alert")).toContainText(
      "E2E Deep Water",
    );
    await page
      .locator(".critical-alert")
      .getByRole("button", { name: "View detail" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "DROWNING · E2E Deep Water",
        exact: true,
      }),
    ).toBeVisible();
    const staffLogin = await request.post(`${baseUrl}/api/auth/login`, {
      data: { username: "staff1", password: setting("DEV_PASSWORD") },
    });
    const staff = await staffLogin.json();
    const headers = { Authorization: `Bearer ${staff.accessToken}` };
    expect(
      (
        await request.patch(
          `${baseUrl}/api/incidents/${created.incidentId}/acknowledge`,
          { headers },
        )
      ).ok(),
    ).toBeTruthy();
    await expect(
      page.locator(".details dd").filter({ hasText: "Lifeguard 1" }),
    ).toBeVisible();
    expect(
      (
        await request.patch(
          `${baseUrl}/api/incidents/${created.incidentId}/start`,
          { headers },
        )
      ).ok(),
    ).toBeTruthy();
    await expect(page.locator(".panel > .badge")).toHaveText("IN PROGRESS");
    expect(
      (
        await request.patch(
          `${baseUrl}/api/incidents/${created.incidentId}/resolve`,
          { headers, data: { note: "E2E swimmer rescued" } },
        )
      ).ok(),
    ).toBeTruthy();
    await expect(page.locator(".panel > .badge")).toHaveText("RESOLVED");
    await expect(page.locator(".timeline li")).toHaveCount(4);
    await expect(
      page.getByText("E2E swimmer rescued", { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({ path: ".runtime/desktop-incident.png" });
    await page
      .locator("nav")
      .getByRole("link", { name: "Dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: ".runtime/desktop-dashboard.png" });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
  }
});
