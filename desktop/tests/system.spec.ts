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
    await page.getByRole("button", { name: "Login", exact: true }).click();
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
    // Unique per run: the development database keeps cameras from earlier runs.
    const cameraName = `E2E Deep Water ${code}`;
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByLabel("Name", { exact: true }).fill(cameraName);
    await page.getByLabel("Location", { exact: true }).fill("North end");
    await page.getByLabel("Status", { exact: true }).selectOption("ONLINE");
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    // Edit camera
    await page
      .getByRole("button", { name: `Edit ${cameraName}`, exact: true })
      .click();
    await page
      .getByLabel("Location", { exact: true })
      .fill("North end, lane 1");
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(
      page.getByText("North end, lane 1", { exact: true }),
    ).toBeVisible();
    // Baseline counters before the AI event
    await page
      .locator("nav")
      .getByRole("link", { name: "Dashboard", exact: true })
      .click();
    const activeCard = page
      .locator(".stat-card", { hasText: "Active incidents" })
      .locator("strong");
    await expect(activeCard).toHaveText(/\d+/);
    const activeBefore = Number(await activeCard.textContent());
    const badge = page.getByTestId("unread-count");
    const unreadBefore = (await badge.count())
      ? Number(await badge.textContent())
      : 0;
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
      cameraName,
    );
    await expect(page.locator(".critical-alert")).toContainText("94%");
    // Statistics and notification badge update in realtime
    await expect(activeCard).toHaveText(String(activeBefore + 1));
    await expect(badge).toHaveText(String(unreadBefore + 1));
    await page
      .locator(".critical-alert")
      .getByRole("button", { name: "View detail" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: `DROWNING · ${cameraName}`,
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
    // A second incident handled entirely from the desktop alert panel.
    const second = await request.post(`${baseUrl}/api/detection-events`, {
      headers: { "X-AI-SERVICE-KEY": setting("AI_SERVICE_KEY") },
      data: {
        cameraId: camera.id,
        eventType: "DROWNING",
        confidence: 0.88,
        detectedAt: new Date(Date.now() - 1000).toISOString(),
      },
    });
    expect(second.status()).toBe(201);
    const secondId = (await second.json()).incidentId;
    const panel = page.locator(".critical-alert");
    await expect(panel).toContainText("88%");
    await panel
      .getByRole("button", { name: "Acknowledge", exact: true })
      .click();
    await expect(panel).toContainText("Handled by");
    await panel
      .getByRole("button", { name: "Start handling", exact: true })
      .click();
    await expect(panel.locator(".badge")).toHaveText("IN PROGRESS");
    await panel.getByRole("button", { name: "Resolve", exact: true }).click();
    await page
      .getByLabel("Resolution note", { exact: true })
      .fill("Resolved from control room");
    await page
      .getByRole("button", { name: "Confirm resolve", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await request.get(`${baseUrl}/api/incidents/${secondId}`, {
                headers: { Authorization: `Bearer ${admin.accessToken}` },
              })
            ).json()
          ).status,
      )
      .toBe("RESOLVED");
    const resolved = await (
      await request.get(`${baseUrl}/api/incidents/${secondId}`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      })
    ).json();
    expect(resolved.handledBy.username).toBe("admin");
    await page
      .locator("nav")
      .getByRole("link", { name: "Dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await expect(activeCard).toHaveText(String(activeBefore));
    await page.screenshot({ path: ".runtime/desktop-dashboard.png" });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
  }
});
