import { ipcMain, dialog, app, BrowserWindow } from "electron";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { listClaudeSessions } from "./sessions.ts";
import { spawnAgent, killAgent, listAgents } from "./agent-manager.ts";

// Lazy: app.getPath("userData") must be called after app.whenReady()
function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(data: Record<string, unknown>) {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

export function registerIpc(hubPort: number) {
  ipcMain.handle("hub:port", () => ({ port: hubPort }));

  ipcMain.handle("self:get-name", () => {
    const cfg = readConfig();
    const name = (cfg.selfName as string | undefined) || os.userInfo().username || "human";
    return { name };
  });

  ipcMain.handle("self:set-name", (_e, name: string) => {
    const cfg = readConfig();
    cfg.selfName = name;
    writeConfig(cfg);
  });

  ipcMain.handle("dialog:pick-folder", async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openDirectory"],
    });
    return { path: result.canceled ? null : result.filePaths[0] };
  });

  ipcMain.handle("agent:list-sessions", (_e, cwd: string) => {
    const sessions = listClaudeSessions(cwd);
    return { sessions };
  });

  ipcMain.handle("agent:spawn", (_e, spec: Parameters<typeof spawnAgent>[0]) => {
    return spawnAgent(spec);
  });

  ipcMain.handle("agent:kill", (_e, { name }: { name: string }) => {
    return killAgent(name);
  });

  ipcMain.handle("agent:list", () => {
    return { agents: listAgents() };
  });
}
