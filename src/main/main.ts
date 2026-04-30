import { app, BrowserWindow, shell, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fixPath } from "./path-fix.ts";
import { startHub } from "./hub/start-hub.ts";
import { initAgentManager, killAllAgents } from "./agent-manager.ts";
import { registerIpc } from "./ipc.ts";

fixPath();

let mainWindow: BrowserWindow | null = null;

// Resolve the icon for dev mode (packaged builds use packagerConfig.icon).
function findIconPath(ext: "icns" | "png"): string | undefined {
  const file = ext === "icns" ? "icon.icns" : "1024x1024.png";
  const fallback = ext === "icns" ? "icon.icns" : "512x512.png";
  for (const root of [app.getAppPath(), path.join(app.getAppPath(), "..", ".."), process.cwd()]) {
    for (const name of [file, fallback]) {
      const p = path.join(root, "assets", "icons", name);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

function createWindow(hubPort: number) {
  const isMac = process.platform === "darwin";
  const winIcon = isMac ? undefined : findIconPath("png");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    // Position traffic lights so they sit vertically centered
    // in the sidebar header area (32px top padding, ~22px content)
    ...(isMac && { trafficLightPosition: { x: 14, y: 14 } }),
    ...(winIcon ? { icon: winIcon } : {}),
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

// macOS Dock title (visible while app is in foreground).
process.title = "coagent";

app.whenReady().then(async () => {
  // macOS Dock — apply early so it lands before the window pops.
  // Use PNG: nativeImage.createFromPath returns an empty image for .icns
  // in some Electron builds.
  if (process.platform === "darwin" && app.dock) {
    const icon = findIconPath("png");
    console.log("[icon] dock candidate:", icon ?? "(none)");
    if (icon) {
      try {
        const img = nativeImage.createFromPath(icon);
        console.log("[icon] image empty?", img.isEmpty(), "size:", img.getSize());
        if (!img.isEmpty()) app.dock.setIcon(img);
        console.log("[icon] dock.setIcon OK");
      } catch (e) {
        console.warn("[icon] dock.setIcon failed:", e);
      }
    }
  }

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
