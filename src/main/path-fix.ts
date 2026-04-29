import { execSync } from "node:child_process";

// On macOS, apps launched from Finder/Dock get a stripped PATH.
// The Claude agent SDK needs to find the `claude` CLI on PATH.
// This runs the user's login shell once to extract its full environment.
export function fixPath(): void {
  if (process.platform !== "darwin") return;
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const out = execSync(`${shell} -ilc 'env'`, {
      encoding: "utf-8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of out.split("\n")) {
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq);
      const val = line.slice(eq + 1);
      if (key === "PATH" || key === "NVM_DIR" || key === "VOLTA_HOME") {
        process.env[key] = val;
      }
    }
  } catch {
    // Non-fatal — fall back to existing PATH
  }
}
