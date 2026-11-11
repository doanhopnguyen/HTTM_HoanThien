import { test, expect, _electron } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

test("camera form uploads a local video and keeps source/model settings on edit", async () => {
  const dataDir = path.resolve(".runtime/electron-camera-config");
  mkdirSync(dataDir, { recursive: true });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[0] !== "ELECTRON_RUN_AS_NODE",
    ),
  );
  const app = await _electron.launch({
    args: [path.resolve("desktop")],
    env: {
      ...env,
      API_BASE_URL: "http://localhost:18089",
      POOL_SAFETY_USER_DATA: dataDir,
    },
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let camera: Record<string, unknown> | null = null;
    let saved: Record<string, unknown> = {};
    let videoUploads = 0;
    let modelUploads = 0;
    const asset = "00000000-0000-0000-0000-000000000001.mp4";
    await page.route("http://localhost:18089/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      let body: unknown = {};
      if (url.pathname === "/api/auth/login")
        body = {
          accessToken: "test-access",
          refreshToken: "test-refresh",
          user: {
            id: "admin-id",
            username: "admin",
            role: "ADMIN",
            fullName: "Administrator",
            status: "ACTIVE",
          },
        };
      else if (url.pathname === "/api/media/videos") {
        expect(req.headers()["content-type"]).toContain(
          "multipart/form-data; boundary=",
        );
        expect(req.postDataBuffer()?.toString()).toContain("pool-test.mp4");
        videoUploads++;
        body = { id: asset, name: "pool-test.mp4" };
      } else if (url.pathname === "/api/media/models") {
        expect(req.postDataBuffer()?.toString()).toContain("trained.pt");
        modelUploads++;
        body = {
          id: "00000000-0000-0000-0000-000000000002.pt",
          name: "trained.pt",
        };
      } else if (
        url.pathname.startsWith("/api/cameras") &&
        ["POST", "PATCH"].includes(req.method())
      ) {
        saved = req.postDataJSON();
        camera = {
          ...camera,
          ...saved,
          id: "camera-id",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          streamUrl: `/api/media/videos/${asset}`,
          streamUrlMasked: `Local video · ${asset}`,
          sourceType: "LOCAL_VIDEO",
        };
        body = camera;
      } else if (url.pathname === "/api/cameras")
        body = {
          content: camera ? [camera] : [],
          totalElements: camera ? 1 : 0,
          totalPages: 1,
          number: 0,
        };
      else if (url.pathname === "/api/ai/status") body = [];
      else if (url.pathname === "/api/notifications/unread-count")
        body = { count: 0 };
      else if (url.pathname === "/api/capabilities")
        body = { staffFalseAlarm: true };
      else body = { content: [], totalElements: 0, totalPages: 0 };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.evaluate(() => {
      window.location.hash = "/cameras";
    });
    await page.getByLabel("Username", { exact: true }).fill("admin");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Test-Password-123!");
    await page.getByRole("checkbox").uncheck();
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByRole("button", { name: "Add camera", exact: true }).click();
    await page.getByLabel("Code", { exact: true }).fill("LOCAL-01");
    await page.getByLabel("Name", { exact: true }).fill("Local pool test");
    await page
      .getByLabel("Loại nguồn video", { exact: true })
      .selectOption("LOCAL_VIDEO");
    await expect(page.getByLabel("Stream URL", { exact: true })).toHaveCount(0);
    await page
      .getByLabel("Chọn video trên máy", { exact: true })
      .setInputFiles({
        name: "pool-test.mp4",
        mimeType: "video/mp4",
        buffer: Buffer.from("test-video"),
      });
    await page
      .getByLabel("Mô hình AI cho camera", { exact: true })
      .selectOption("YOLO26N");
    await page
      .getByLabel("Ngưỡng tin cậy AI (0.05–1)", { exact: true })
      .fill("0.65");
    await page.screenshot({ path: ".runtime/camera-config-form.png" });
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(page.getByText("LOCAL-01", { exact: true })).toBeVisible();
    expect(saved.streamUrl).toBe(`local-video:${asset}`);
    expect(saved.aiModel).toBe("YOLO26N");
    expect(saved.aiConfidence).toBe(0.65);
    expect(videoUploads).toBe(1);
    await page
      .getByRole("button", { name: "Edit Local pool test", exact: true })
      .click();
    await page.getByLabel("Location", { exact: true }).fill("North pool");
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(page.getByText("North pool", { exact: true })).toBeVisible();
    expect(saved).not.toHaveProperty("streamUrl");
    expect(videoUploads).toBe(1);
    // Checkpoint selection is independent of the video source.
    await page
      .getByRole("button", {
        name: "Chọn mô hình cho Local pool test",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Mô hình AI cho camera", { exact: true })
      .selectOption("ULTRALYTICS");
    const chooserPromise = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Chọn mô hình đã huấn luyện", exact: true })
      .click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "trained.pt",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("test-checkpoint"),
    });
    await page
      .getByRole("button", { name: "Save camera", exact: true })
      .click();
    await expect(page.getByText("ULTRALYTICS", { exact: true })).toBeVisible();
    expect(saved.aiModel).toBe("ULTRALYTICS");
    expect(saved.modelAsset).toBe("00000000-0000-0000-0000-000000000002.pt");
    expect(modelUploads).toBe(1);
    expect(videoUploads).toBe(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: ".runtime/camera-config-list.png" });
  } finally {
    await app.close();
  }
});
