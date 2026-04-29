/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { CoagentAPI } from "@shared/types.ts";

declare global {
  interface Window {
    coagent: CoagentAPI;
  }
}
