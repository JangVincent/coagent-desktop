import { writable } from "svelte/store";
import type { Participant } from "@shared/protocol.ts";

export const roster = writable<Participant[]>([]);
