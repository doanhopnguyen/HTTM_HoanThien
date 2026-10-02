import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import path from "node:path";
import { readFile, writeFile, unlink } from "node:fs/promises";

let window: BrowserWindow | null = null;
const dev = !app.isPackaged && process.argv.includes("--dev");
if (!app.isPackaged && process.env.POOL_SAFETY_USER_DATA)
  app.setPath("userData", path.resolve(process.env.POOL_SAFETY_USER_DATA));
const tokenPath = () => path.join(app.getPath("userData"), "session.enc");
const configPath = () => path.join(app.getPath("userData"), "config.json");
function validateSender(event: Electron.IpcMainInvokeEvent) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  )
    throw new Error("Invalid IPC sender");
}
app.whenReady().then(async () => {
  ipcMain.handle("session:load", async (event) => {
    validateSender(event);
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      return safeStorage.decryptString(await readFile(tokenPath()));
    } catch {
      return null;
    }
  });
  ipcMain.handle("session:save", async (event, token: unknown) => {
    validateSender(event);
    if (token === null) {
      await unlink(tokenPath()).catch(() => undefined);
      return;
    }
    if (typeof token !== "string" || token.length > 255)
      throw new Error("Invalid session token");
    if (!safeStorage.isEncryptionAvailable())
      throw new Error(
        "Secure storage unavailable. Sign in without Remember me.",
      );
    await writeFile(tokenPath(), safeStorage.encryptString(token));
  });
  ipcMain.handle("config:load", async (event) => {
    validateSender(event);
    try {
      const config = JSON.parse(await readFile(configPath(), "utf8"));
      return { baseUrl: config.baseUrl };
    } catch {
      return { baseUrl: process.env.API_BASE_URL || "http://localhost:8080" };
    }
  });
  ipcMain.handle("config:save", async (event, baseUrl: unknown) => {
    validateSender(event);
    if (typeof baseUrl !== "string" || baseUrl.length > 2048)
      throw new Error("Invalid backend URL");
    const url = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      throw new Error("Use an HTTP(S) server origin");
    await writeFile(configPath(), JSON.stringify({ baseUrl: url.origin }));
  });
  window = new BrowserWindow({
    width: 1440,
    height: 950,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: "#f1f5f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  if (dev) await window.loadURL("http://127.0.0.1:5173");
  else await window.loadFile(path.join(__dirname, "../dist/index.html"));
});
app.on("window-all-closed", () => app.quit());
