import { writable } from "svelte/store";
import type { ActivityMsg } from "@shared/protocol.ts";

// Keyed by agent name (activities are per-agent, displayed in the room they belong to)
export const activities = writable<Map<string, ActivityMsg>>(new Map());

export function setActivity(msg: ActivityMsg) {
  activities.update((map) => {
    const m = new Map(map);
    m.set(msg.name, msg);
    return m;
  });
}
