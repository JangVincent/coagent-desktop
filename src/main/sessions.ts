import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PastSession } from "../shared/types.ts";

export type { PastSession };

const PREVIEW_BYTES = 4 * 1024;
const PREVIEW_CHAR_LIMIT = 60;
const BYTES_PER_TURN_ESTIMATE = 2 * 1024;

export function encodeProjectPath(p: string): string {
  // macOS/Linux: replace slashes with hyphens (Claude Code internal format).
  // Windows: normalise backslashes first.
  return p.replace(/\\/g, "/").replace(/\//g, "-");
}

export function listClaudeSessions(cwdPath: string): PastSession[] {
  const projectsDir = path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(projectsDir)) return [];
  const projectDir = path.join(projectsDir, encodeProjectPath(cwdPath));
  if (!fs.existsSync(projectDir)) return [];

  const files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
  const sessions: PastSession[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(projectDir, file);
      const stat = fs.statSync(fullPath);
      const sid = file.replace(/\.jsonl$/, "");

      const fd = fs.openSync(fullPath, "r");
      const buf = Buffer.alloc(Math.min(PREVIEW_BYTES, stat.size));
      fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const headLines = buf
        .toString("utf-8")
        .split("\n")
        .filter((l) => l.trim().length > 0);

      let preview = "";
      for (const line of headLines) {
        try {
          const m = JSON.parse(line);
          if (m.type === "user" && m.message?.content) {
            const c = m.message.content;
            if (typeof c === "string") preview = c;
            else if (Array.isArray(c) && c[0]?.type === "text")
              preview = c[0].text ?? "";
            if (preview) break;
          }
        } catch {
          // partial JSON at cutoff — ignore
        }
      }

      preview = preview.replace(/\s+/g, " ").trim().slice(0, PREVIEW_CHAR_LIMIT);
      const turns = Math.max(1, Math.round(stat.size / BYTES_PER_TURN_ESTIMATE));
      sessions.push({ sid, mtimeMs: stat.mtimeMs, preview, turns });
    } catch {
      // skip unreadable file
    }
  }

  return sessions.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
