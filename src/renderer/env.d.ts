/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { CoagentAPI } from "@shared/types.ts";

declare module "svelte/elements" {
  export interface HTMLAttributes<T extends EventTarget> {
    autocorrect?: "on" | "off" | undefined | null;
  }
}

declare global {
  interface Window {
    coagent: CoagentAPI;
  }
  // Injected at build time by electron-vite (see electron.vite.config.ts).
  const __APP_VERSION__: string;
}
