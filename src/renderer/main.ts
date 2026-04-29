import { mount } from "svelte";
import App from "./components/App.svelte";

// macOS hiddenInset: traffic lights at y≈14, height≈14 → need ~36px top clearance
// Use a CSS variable so RoomSidebar's scoped CSS can consume it directly
if (navigator.userAgent.includes("Macintosh")) {
  document.documentElement.style.setProperty("--sidebar-top-padding", "36px");
}

const app = mount(App, { target: document.getElementById("app")! });

export default app;
