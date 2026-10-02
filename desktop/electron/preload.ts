import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("poolSafety", {
  loadToken: (): Promise<string | null> => ipcRenderer.invoke("session:load"),
  saveToken: (token: string | null): Promise<void> =>
    ipcRenderer.invoke("session:save", token),
  loadConfig: (): Promise<{ baseUrl: string }> =>
    ipcRenderer.invoke("config:load"),
  saveConfig: (baseUrl: string): Promise<void> =>
    ipcRenderer.invoke("config:save", baseUrl),
});
