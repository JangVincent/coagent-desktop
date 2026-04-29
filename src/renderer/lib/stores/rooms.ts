import { writable, get } from "svelte/store";
import { DEFAULT_ROOM } from "@shared/protocol.ts";
import type { RoomSpec, AgentSpec } from "@shared/types.ts";

export type { RoomSpec };

export const rooms = writable<RoomSpec[]>([
  { id: DEFAULT_ROOM, label: "default" },
]);

export const activeRoomId = writable<string>(DEFAULT_ROOM);

export function createRoom(id: string, label: string) {
  rooms.update((list) => {
    if (list.find((r) => r.id === id)) return list;
    return [...list, { id, label }];
  });
}

export function deleteRoom(id: string) {
  rooms.update((list) => list.filter((r) => r.id !== id));
  // If deleted room was active, switch to default
  if (get(activeRoomId) === id) {
    activeRoomId.set(DEFAULT_ROOM);
  }
}

export function renameRoom(id: string, label: string) {
  rooms.update((list) =>
    list.map((r) => (r.id === id ? { ...r, label } : r))
  );
}

export function ensureRoom(id: string, label?: string) {
  rooms.update((list) => {
    if (list.find((r) => r.id === id)) return list;
    return [...list, { id, label: label ?? id }];
  });
}
