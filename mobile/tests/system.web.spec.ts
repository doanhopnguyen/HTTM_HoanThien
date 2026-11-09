import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("React Native screens complete staff rescue flow in browser preview", async ({
  page,
  request,
}) => {
  const settings = Object.fromEntries(
    readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => {
        const split = line.indexOf("=");
        return [line.slice(0, split), line.slice(split + 1)];
      }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const backend = process.env.E2E_BASE_URL || "http://localhost:8080";
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("staff1");
  await page
    .getByLabel("Password", { exact: true })
    .fill(settings.DEV_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByText("ACTIVE ALERTS", { exact: true })).toBeVisible();
  await expect(
    page.getByText("ON DUTY · CONNECTED", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: ".runtime/mobile-preview-home.png" });
  const session = await (
    await request.post(backend + "/api/auth/login", {
      data: { username: "admin", password: settings.DEV_PASSWORD },
    })
  ).json();
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  // A second client (the admin control room) listens on the real WebSocket.
  const adminEvents: { type: string; data?: { id?: string; status?: string } }[] =
    [];
  const socket = new WebSocket(backend.replace(/^http/, "ws") + "/ws");
  await new Promise<void>((resolve, reject) => {
    socket.onerror = () => reject(new Error("admin WebSocket failed"));
    socket.onopen = () =>
      socket.send(JSON.stringify({ type: "AUTH", token: session.accessToken }));
    socket.onmessage = (message) => {
      const event = JSON.parse(String(message.data));
      if (event.type === "AUTHENTICATED") resolve();
      else adminEvents.push(event);
    };
  });
  const camera = await (
    await request.post(backend + "/api/cameras", {
      headers,
      data: {
        code: `WEB-${Date.now()}`,
        name: "Mobile E2E Deep Pool",
        status: "ONLINE",
        monitoringEnabled: true,
      },
    })
  ).json();
  const result = await request.post(backend + "/api/detection-events", {
    headers: { "X-AI-SERVICE-KEY": settings.AI_SERVICE_KEY },
    data: {
      cameraId: camera.id,
      eventType: "DROWNING",
      confidence: 0.94,
      detectedAt: new Date(Date.now() - 1000).toISOString(),
    },
  });
  expect(result.status()).toBe(201);
  const created = await result.json();
  await page
    .getByText("DROWNING alert · Mobile E2E Deep Pool", { exact: true })
    .click();
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page
      .getByText("ACKNOWLEDGED", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start handling", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page
      .getByText("IN PROGRESS", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page
    .getByLabel("Resolution note", { exact: true })
    .fill("Mobile UI swimmer rescued");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page
      .getByText("RESOLVED", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Resolution note", { exact: true }),
  ).toBeHidden();
  for (const action of [
    "Detection received",
    "Acknowledged",
    "Started handling",
    "Resolved",
  ]) {
    await expect(
      page.getByText(action, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  }
  const incident = await (
    await request.get(backend + `/api/incidents/${created.incidentId}`, {
      headers,
    })
  ).json();
  expect(incident.status).toBe("RESOLVED");
  expect(incident.handledBy.username).toBe("staff1");
  // Other clients are updated in realtime, not only on reload.
  await expect
    .poll(() =>
      adminEvents.some(
        (e) =>
          e.type === "INCIDENT_RESOLVED" && e.data?.id === created.incidentId,
      ),
    )
    .toBe(true);
  for (const type of ["INCIDENT_ACKNOWLEDGED", "INCIDENT_STARTED"])
    expect(adminEvents.some((e) => e.type === type)).toBe(true);
  socket.close();
  expect(
    (
      await (
        await request.get(
          backend + `/api/incidents/${created.incidentId}/history`,
          { headers },
        )
      ).json()
    ).totalElements,
  ).toBe(4);
  await page.screenshot({ path: ".runtime/mobile-preview-incident.png" });
  await page
    .getByText("Started handling", { exact: true })
    .filter({ visible: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".runtime/mobile-preview-timeline.png" });
  await page.getByRole("link", { name: /back/i }).click();
  await page.getByRole("tab", { name: /Profile/ }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
