import { utilityProcess, app } from "electron";
import type { UtilityProcess } from "electron";
import path from "node:path";
import type { AgentSpec } from "../shared/types.ts";

export type { AgentSpec };

interface AgentHandle {
  spec: AgentSpec & { resumeSessionId?: string };
  proc: UtilityProcess;
}

const agents = new Map<string, AgentHandle>();
let hubPort = 0;
let onStatusChange: ((name: string, status: AgentSpec["status"], code?: number) => void) | null = null;
let onLog: ((name: string, stream: "stdout" | "stderr", line: string) => void) | null = null;

export function initAgentManager(
  port: number,
  statusCb: typeof onStatusChange,
  logCb: typeof onLog,
) {
  hubPort = port;
  onStatusChange = statusCb;
  onLog = logCb;
}

function agentEntryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "agent-runtime", "entry.cjs");
  }
  return path.join(app.getAppPath(), "out", "agent-runtime", "entry.cjs");
}

export function spawnAgent(spec: {
  name: string;
  cwd: string;
  room: string;
  model?: string;
  resumeSessionId?: string;
}): { ok: boolean; error?: string } {
  if (agents.has(spec.name)) {
    return { ok: false, error: `agent '${spec.name}' already running` };
  }

  const entry = agentEntryPath();
  const envBase = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;
  const env: Record<string, string> = {
    ...envBase,
    HUB_URL: `ws://127.0.0.1:${hubPort}`,
    AGENT_NAME: spec.name,
    AGENT_CWD: spec.cwd,
    AGENT_ROOM: spec.room,
    ...(spec.model ? { AGENT_MODEL: spec.model } : {}),
    ...(spec.resumeSessionId ? { RESUME_SESSION_ID: spec.resumeSessionId } : {}),
  };

  const proc = utilityProcess.fork(entry, [spec.name, spec.cwd], {
    serviceName: spec.name,
    stdio: "pipe",
    env,
  });

  const handle: AgentHandle = {
    spec: { ...spec, status: "starting" },
    proc,
  };
  agents.set(spec.name, handle);

  proc.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n").filter(Boolean)) {
      onLog?.(spec.name, "stdout", line);
    }
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n").filter(Boolean)) {
      onLog?.(spec.name, "stderr", line);
    }
  });

  proc.on("spawn", () => {
    const h = agents.get(spec.name);
    if (h) h.spec.status = "running";
    onStatusChange?.(spec.name, "running");
  });

  proc.on("exit", (code) => {
    agents.delete(spec.name);
    onStatusChange?.(spec.name, "exited", code ?? undefined);
  });

  return { ok: true };
}

export function killAgent(name: string): { ok: boolean } {
  const h = agents.get(name);
  if (!h) return { ok: false };
  h.proc.kill();
  return { ok: true };
}

export function listAgents(): AgentSpec[] {
  return [...agents.values()].map((h) => ({
    name: h.spec.name,
    cwd: h.spec.cwd,
    room: h.spec.room,
    model: h.spec.model,
    status: h.spec.status,
  }));
}

export async function killAllAgents(): Promise<void> {
  for (const [, h] of agents) {
    try { h.proc.kill(); } catch {}
  }
  agents.clear();
}
