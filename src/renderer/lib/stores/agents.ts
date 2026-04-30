import { writable } from "svelte/store";
import type { AgentSpec } from "@shared/types.ts";

export type { AgentSpec };

export const agents = writable<AgentSpec[]>([]);

export function updateAgentStatus(name: string, status: AgentSpec["status"]) {
  agents.update((list) => {
    const idx = list.findIndex((a) => a.name === name);
    if (idx < 0) return list;
    const updated = [...list];
    updated[idx] = { ...updated[idx], status };
    if (status === "exited") {
      setTimeout(() => {
        agents.update((l) => l.filter((a) => !(a.name === name && a.status === "exited")));
      }, 3000);
    }
    return updated;
  });
}

export function addAgent(spec: AgentSpec) {
  agents.update((list) => [...list.filter((a) => a.name !== spec.name), spec]);
}

export function dropAgents(names: Set<string>) {
  if (names.size === 0) return;
  agents.update((list) => list.filter((a) => !names.has(a.name)));
}

export function setAgentPaused(name: string, paused: boolean) {
  agents.update((list) => {
    const idx = list.findIndex((a) => a.name === name);
    if (idx < 0) return list;
    if (list[idx].paused === paused) return list;
    const updated = [...list];
    updated[idx] = { ...updated[idx], paused };
    return updated;
  });
}

export function renameAgentInStore(oldName: string, newName: string) {
  agents.update((list) => {
    const idx = list.findIndex((a) => a.name === oldName);
    if (idx < 0) return list;
    const updated = [...list];
    updated[idx] = { ...updated[idx], name: newName };
    return updated;
  });
}
