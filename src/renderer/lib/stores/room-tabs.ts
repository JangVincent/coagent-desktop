import { writable, get } from "svelte/store";
import { DEFAULT_ROOM } from "@shared/protocol.ts";
import { activeRoomId } from "./rooms.ts";

// Ordered list of room ids currently open as tabs in the chat header.
// default room is always open and pinned first.
export const openRoomIds = writable<string[]>([DEFAULT_ROOM]);

export function openTab(id: string) {
  openRoomIds.update((list) => (list.includes(id) ? list : [...list, id]));
  activeRoomId.set(id);
}

export function closeTab(id: string) {
  if (id === DEFAULT_ROOM) return;
  const ids = get(openRoomIds);
  const idx = ids.indexOf(id);
  if (idx < 0) return;
  const next = ids.filter((x) => x !== id);
  openRoomIds.set(next);
  if (get(activeRoomId) === id) {
    const fallback = next[Math.max(0, idx - 1)] ?? DEFAULT_ROOM;
    activeRoomId.set(fallback);
  }
}
