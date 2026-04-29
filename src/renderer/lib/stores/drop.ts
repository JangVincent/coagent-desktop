import { writable } from "svelte/store";

// Paths dropped anywhere in the chat area — Composer subscribes and inserts them
export const pendingDropPaths = writable<string[]>([]);

export function pushDropPaths(paths: string[]) {
  if (paths.length) pendingDropPaths.set(paths);
}

export function clearDropPaths() {
  pendingDropPaths.set([]);
}
