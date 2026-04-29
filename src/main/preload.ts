import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { CoagentAPI, AgentSpec } from "../shared/types.ts";

const api: CoagentAPI = {
  getHubPort: () => ipcRenderer.invoke("hub:port"),
  getSelfName: () => ipcRenderer.invoke("self:get-name"),
  setSelfName: (name) => ipcRenderer.invoke("self:set-name", name),
  pickFolder: () => ipcRenderer.invoke("dialog:pick-folder"),
  pickPaths: () => ipcRenderer.invoke("dialog:pick-paths"),
  // Electron 28+: File.path removed, use webUtils instead
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  listSessions: (cwd) => ipcRenderer.invoke("agent:list-sessions", cwd),
  spawnAgent: (spec) => ipcRenderer.invoke("agent:spawn", spec),
  killAgent: (name) => ipcRenderer.invoke("agent:kill", { name }),
  listAgents: () => ipcRenderer.invoke("agent:list"),

  onAgentStatus: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: Parameters<typeof cb>[0]) => cb(data);
    ipcRenderer.on("agent:status", handler);
    return () => ipcRenderer.off("agent:status", handler);
  },
  onAgentLog: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: Parameters<typeof cb>[0]) => cb(data);
    ipcRenderer.on("agent:log", handler);
    return () => ipcRenderer.off("agent:log", handler);
  },
};

contextBridge.exposeInMainWorld("coagent", api);
