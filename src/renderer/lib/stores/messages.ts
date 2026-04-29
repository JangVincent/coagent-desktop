import { writable } from "svelte/store";
import { DEFAULT_ROOM } from "@shared/protocol.ts";
import type { ServerMsg } from "@shared/protocol.ts";

export type ChatEntry =
  | { kind: "chat"; from: string; content: string; ts: number }
  | { kind: "system"; text: string; ts: number }
  | { kind: "control_ack"; from: string; op: string; ok: boolean; info?: string; ts: number };

// Keyed by room id
export const messages = writable<Map<string, ChatEntry[]>>(new Map());

function ensureRoom(map: Map<string, ChatEntry[]>, roomId: string) {
  if (!map.has(roomId)) map.set(roomId, []);
}

export function appendToRoom(roomId: string, entry: ChatEntry) {
  messages.update((map) => {
    const m = new Map(map);
    const existing = m.get(roomId) ?? [];
    // Create a NEW array so Svelte's reactivity detects the change
    m.set(roomId, [...existing, entry]);
    return m;
  });
}

export function clearRoom(roomId: string) {
  messages.update((map) => {
    const m = new Map(map);
    m.set(roomId, []);
    return m;
  });
}

export function dispatchServerMsg(msg: ServerMsg, _selfName: string) {
  const now = Date.now();
  if (msg.type === "message") {
    appendToRoom(msg.room, { kind: "chat", from: msg.from, content: msg.content, ts: msg.ts });
  } else if (msg.type === "system") {
    const room = msg.room ?? DEFAULT_ROOM;
    appendToRoom(room, { kind: "system", text: msg.text, ts: now });
  } else if (msg.type === "control_ack") {
    appendToRoom(msg.room, {
      kind: "control_ack",
      from: msg.from,
      op: msg.op,
      ok: msg.ok,
      info: msg.info,
      ts: msg.ts,
    });
  }
}
