# coagent-desktop — Implementation Plan

## Context

`/Users/vincent/Dev/coagent-desktop/` is an empty git repo. Goal: build an **all-in-one Electron desktop app** that wraps the existing `coagent` CLI (sibling at `/Users/vincent/Dev/coagent/`) so end users never touch the terminal.

`coagent` is a multi-participant chat hub for Claude Code agents. Three roles speak a small JSON-over-WebSocket protocol:
- **hub** (`coagent/src/hub.ts`) — routes messages, stateless.
- **agent** (`coagent/src/agent.ts`) — wraps `@anthropic-ai/claude-agent-sdk` pinned to a working directory; one process per project.
- **human** (`coagent/src/human.tsx`) — Ink TUI we are replacing.

The desktop app will boot its own hub, spawn an agent process per project the user picks, and replace the Ink TUI with a Svelte chat UI in a webview. CLI parity plus markdown rendering and UI-driven slash commands.

User-locked decisions: Electron (not Tauri); Svelte 5 (not React); fork coagent code into the desktop repo (no npm dep on coagent); macOS + Windows; full feature parity at MVP.

## Architecture

### Process model
- **Hub**: in-process module in Electron main. Adapt `coagent/src/hub.ts` into `startHub({ host: '127.0.0.1', port: 0 })` returning `{ port, close }`. Bind to `port: 0` to avoid collision with a standalone `coagent hub`.
- **Agents**: each spawned via `utilityProcess.fork(agentEntryPath)` from main. Full Node runtime (the SDK calls `executable: "node"` at `agent.ts:218,283` so this matches), Electron lifecycle integration, clean `kill()`. Pass cwd/model/resume via env: `HUB_URL`, `AGENT_NAME`, `AGENT_CWD`, `AGENT_MODEL`, `RESUME_SESSION_ID`. `stdio: 'pipe'` and forward stdout/stderr to a per-agent ring buffer for a debug pane.
- **Renderer ↔ Hub**: direct `WebSocket` to `ws://127.0.0.1:<port>` exactly like a human client. Reuses `protocol.ts` verbatim — no message duplication in IPC.
- **Renderer ↔ Main (IPC)**: only for things the renderer can't do (filesystem, dialogs, spawn). Channels enumerated below.

### Project layout

```
coagent-desktop/
├── package.json
├── electron.vite.config.ts
├── forge.config.cjs
├── tsconfig.{base,main,renderer}.json
└── src/
    ├── shared/
    │   └── protocol.ts                  # VERBATIM from coagent/src/protocol.ts
    ├── main/
    │   ├── main.ts                      # app, BrowserWindow, IPC wiring
    │   ├── preload.ts                   # contextBridge → window.coagent.*
    │   ├── hub/start-hub.ts             # ADAPTED from coagent/src/hub.ts
    │   ├── agent-manager.ts             # utilityProcess spawn/kill, name→handle map
    │   ├── sessions.ts                  # listClaudeSessions (lifted from coagent/src/agent/session-picker.ts, no clack)
    │   ├── ipc.ts                       # ipcMain.handle registrations
    │   └── path-fix.ts                  # restore login-shell PATH on macOS Finder launch
    ├── agent-runtime/                   # what utilityProcess actually executes
    │   ├── entry.ts                     # ADAPTED from coagent/src/agent.ts (drop --resume picker)
    │   └── helpers/
    │       ├── intro.ts                 # VERBATIM from coagent/src/agent/intro.ts
    │       └── usage.ts                 # VERBATIM from coagent/src/agent/usage.ts
    └── renderer/
        ├── index.html
        ├── main.ts                      # mounts <App>
        ├── lib/
        │   ├── ws-client.ts             # connects to hub, dispatches into stores
        │   ├── slash-commands.ts        # COMMANDS array ported from coagent/src/human/slash.ts
        │   ├── mention.ts               # parseMentions wrapper + autocomplete
        │   ├── markdown.ts              # marked + DOMPurify + highlight.js
        │   ├── ipc.ts                   # typed wrapper around window.coagent
        │   └── stores/{agents,roster,messages,activities,self}.ts
        └── components/
            ├── App.svelte
            ├── AgentSidebar.svelte
            ├── ChatView.svelte
            ├── MarkdownMessage.svelte
            ├── ActivityBadge.svelte
            ├── Composer.svelte           # textarea + popups + drag&drop
            ├── MentionPopup.svelte
            ├── FilePopup.svelte
            ├── SlashMenu.svelte
            ├── SlashCommandBar.svelte    # buttons per ControlOp
            ├── ModeToggle.svelte
            ├── ModelPicker.svelte
            ├── ProjectPicker.svelte
            └── SessionResumeDialog.svelte
```

### Forking strategy

| Source (coagent) | Destination | Treatment |
|---|---|---|
| `src/protocol.ts` | `src/shared/protocol.ts` | verbatim (Vite alias used on renderer side) |
| `src/hub.ts` | `src/main/hub/start-hub.ts` | strip CLI argv/env parsing, `SIGINT`/`SIGTERM`, listening log; wrap as `startHub(opts)` |
| `src/agent.ts` | `src/agent-runtime/entry.ts` | ~95% verbatim. Drop interactive `runResumePicker()` (clack/TTY-only); read resume sid from env `RESUME_SESSION_ID`. Drop `--resume` argv path |
| `src/agent/intro.ts` | `src/agent-runtime/helpers/intro.ts` | verbatim |
| `src/agent/usage.ts` | `src/agent-runtime/helpers/usage.ts` | verbatim |
| `src/agent/session-picker.ts` | `src/main/sessions.ts` | keep `encodeProjectPath` + `listClaudeSessions`; drop the clack picker |
| `src/human/slash.ts` (`COMMANDS` array) | `src/renderer/lib/slash-commands.ts` | port shape; reuse for SlashMenu autocomplete and SlashCommandBar buttons |
| `src/human.tsx`, `src/cli.ts`, `src/render-content.tsx`, `src/human/file-ref.ts` | — | skip; reimplement file-ref logic directly in `Composer.svelte` |

### IPC contract (preload exposes `window.coagent`)

```
hub:port              ()                                     → { port: number }     // sync at boot
self:get-name         ()                                     → { name: string }
self:set-name         (name)                                 → void
dialog:pick-folder    ()                                     → { path: string|null }
agent:list-sessions   (cwd)                                  → { sessions: { sid, mtimeMs, preview, turns }[] }
agent:spawn           ({ name, cwd, model?, resumeSessionId? }) → { ok, error? }
agent:kill            ({ name })                             → { ok }
agent:list            ()                                     → { agents: AgentSpec[] }
# pushed events
agent:status          { name, status: 'starting'|'running'|'exited', code? }
agent:log             { name, stream: 'stdout'|'stderr', line }
```

Chat traffic (messages, control ops, control_ack, activity, roster) goes over WebSocket — never IPC.

### Renderer state (Svelte 5 runes)
- `agents`: `{ name, cwd, model?, mode, status }[]` — kept in sync with main via `agent:status` events.
- `roster`: live `Participant[]` from `RosterMsg`.
- `messages`: `Map<agentName | 'all', ChatEntry[]>` — per-tab chat history.
- `activities`: `Map<name, ActivityMsg>`.
- `selfName`: from `os.userInfo().username` on first launch, persisted under `app.getPath('userData')/config.json`. On hub `name already taken` rejection, append numeric suffix and retry.

## Key files to read before touching

- `/Users/vincent/Dev/coagent/src/protocol.ts` — wire format, `parseMentions`, `newMentionRegex`.
- `/Users/vincent/Dev/coagent/src/hub.ts` — routing semantics, anti-spoof in `MSG.ACTIVITY` handler.
- `/Users/vincent/Dev/coagent/src/agent.ts` — `executable: "node"` (line 218, 283), permission-mode default logic, control-op dispatch in `handleControl`, abort/queue model.
- `/Users/vincent/Dev/coagent/src/agent/session-picker.ts` — `encodeProjectPath` (note: forward-slash only; needs Windows handling).
- `/Users/vincent/Dev/coagent/src/human/slash.ts` — `COMMANDS` (target shape for the slash UI).

## Risks / open questions

1. **macOS `PATH` from Finder.** `claude-agent-sdk` shells out to a CLI binary; Finder-launched Electron has a stripped env. Resolve once at boot via `$SHELL -ilc 'env'` (or use `fix-path`) before any `utilityProcess.fork`. **Validate in Phase 1.**
2. **Claude credentials.** SDK reads `~/.claude/...` and/or `ANTHROPIC_API_KEY`. Confirm they pass through to the utilityProcess env in both dev and packaged builds.
3. **Windows path encoding for `~/.claude/projects/<encoded>`.** `encodeProjectPath` only handles `/`. Need to install Claude Code on Windows, point at a project, inspect `%USERPROFILE%\.claude\projects\` to learn the actual scheme, then update `sessions.ts` accordingly.
4. **Code signing / notarization.** Mac: Apple Developer ID + `@electron/notarize` via Forge. Windows: defer to self-signed for first internal builds; SmartScreen warns until reputation builds.
5. **Quit cleanup.** On `app.before-quit`: send `kill` control via hub (graceful), wait ~300 ms, then `utilityProcess.kill('SIGTERM')`, then `wss.close()`. Verify no orphaned `node` processes.
6. **Markdown safety.** Use `marked` + `DOMPurify`; restrict allowed schemes (`http`, `https`, `mailto`, no `javascript:`). Custom renderer collapses fenced blocks > 30 lines.

## Phase ordering

| Phase | Goal | ETA |
|---|---|---|
| 0. Scaffold | `npm init`, Electron + Forge + electron-vite + Svelte 5; empty BrowserWindow boots; preload+IPC hello world | ½ d |
| 1. Hub-in-main + 1 hardcoded agent | Copy `protocol.ts`, adapt `start-hub.ts` and `agent-runtime/entry.ts`. Hardcode a spawn against `/Users/vincent/Dev/coagent`. Renderer connects WS, dumps incoming JSON. **Goal: see `roster` containing the agent.** | 1 d |
| 2. Minimal chat loop | Markdown rendering, ChatView + Composer (no popups). Send a message, see a markdown reply. **Validates SDK auth in Electron.** | 1–2 d |
| 3. Project lifecycle | ProjectPicker dialog, AgentSidebar, IPC `agent:spawn`/`kill`/`list`. Multiple agents at once. | 1 d |
| 4. Full slash UI | SlashCommandBar, ModeToggle, ModelPicker, ActivityBadge, ControlAck rendering. Confirm modals on `/clear` and `/kill`. | 1–2 d |
| 5. Niceties | @-mention popup, file popup, drag&drop, SessionResumeDialog, log pane, color palette, name persistence. | 1–2 d |
| 6. Packaging | Forge `make` for mac dmg + win squirrel. Code signing on mac. Smoke test packaged build. | 1–2 d |

## Verification

End-to-end smoke after Phase 4 (re-run after Phase 6 against the packaged build):

1. Launch app → empty sidebar, empty chat.
2. **+ Add project** → folder dialog → pick `/Users/vincent/Dev/coagent`.
3. SessionResumeDialog appears with past sessions for that path. Pick **fresh**.
4. Sidebar shows `coagent (running)`. ActivityBadge → idle.
5. Composer: `@coagent what files are in src/?` → Send. Badge: thinking → tool (Read/Glob) → idle. Reply renders as a clean markdown bullet list.
6. Click `/status` button → control_ack appears as a system bubble (`session=… mode=… task=idle …`).
7. ModeToggle → **plan** → ack: `bypassPermissions → plan`.
8. ModelPicker → `claude-haiku-4-5` → ack: `(sdk default) → claude-haiku-4-5 (applies to next turn)`.
9. `/usage` button → formatted usage line.
10. Add second project (`coagent-desktop` itself); two agents; tabs switchable.
11. Drag a file from Finder into composer → absolute path inserted at caret.
12. Type `@coa` → MentionPopup shows `coagent`.
13. `/kill` → confirm modal → agent exits → `agent:status exited` event → sidebar shows killed.
14. Cmd-Q → quits within ~1 s → `ps aux | grep node` shows no orphaned processes.

Repeat (1)–(14) on Windows after Phase 6, paying particular attention to (3) — confirms the Windows `encodeProjectPath` fix.
