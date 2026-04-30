/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { CoagentAPI } from "@shared/types.ts";

declare global {
  interface Window {
    coagent: CoagentAPI;
  }
  // Injected at build time by electron-vite (see electron.vite.config.ts).
  const __APP_VERSION__: string;
}
