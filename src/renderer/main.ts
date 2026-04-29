import { mount } from "svelte";
import App from "./components/App.svelte";

// Detect platform via userAgent so CSS can apply macOS-specific safe areas
if (navigator.userAgent.includes("Macintosh")) {
  document.documentElement.dataset.platform = "darwin";
}

const app = mount(App, { target: document.getElementById("app")! });

export default app;
