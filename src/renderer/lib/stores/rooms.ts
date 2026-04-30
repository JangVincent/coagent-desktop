import { writable } from "svelte/store";
import { DEFAULT_ROOM } from "@shared/protocol.ts";
import type { RoomSpec } from "@shared/types.ts";

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

export function deleteRoom(id: string) {
  if (id === DEFAULT_ROOM) return;
  rooms.update((list) => list.filter((r) => r.id !== id));
}
