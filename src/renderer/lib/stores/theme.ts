import { writable } from "svelte/store";

type Theme = "dark" | "light";

function createThemeStore() {
  const stored = (typeof localStorage !== "undefined"
    ? localStorage.getItem("coagent-theme")
    : null) as Theme | null;

  const initial: Theme = stored ?? "dark";
  const { subscribe, set } = writable<Theme>(initial);

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", initial);
  }

  return {
    subscribe,
    toggle() {
      set((current) => {
        const next: Theme = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("coagent-theme", next);
        return next;
      });
    },
  };
}

export const theme = createThemeStore();
