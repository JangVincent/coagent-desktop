import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fixPath } from "./path-fix.ts";
import { startHub } from "./hub/start-hub.ts";
import { initAgentManager, killAllAgents } from "./agent-manager.ts";
import { registerIpc } from "./ipc.ts";

fixPath();

let mainWindow: BrowserWindow | null = null;

function createWindow(hubPort: number) {
  const isMac = process.platform === "darwin";
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    // Position traffic lights so they sit vertically centered
    // in the sidebar header area (32px top padding, ~22px content)
    ...(isMac && { trafficLightPosition: { x: 14, y: 14 } }),
    backgroundColor: "#0c0c0c",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  const hub = await startHub({ host: "127.0.0.1", port: 0 });

  function safeSend(channel: string, payload: unknown) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  }

  initAgentManager(
    hub.port,
    (name, status, code) => safeSend("agent:status", { name, status, code }),
    (name, stream, line) => safeSend("agent:log", { name, stream, line }),
  );

  registerIpc(hub.port);
  createWindow(hub.port);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(hub.port);
  });

  app.on("before-quit", async (e) => {
    e.preventDefault();
    await killAllAgents();
    await hub.close();
    app.exit(0);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
