<script lang="ts">
  import { rooms, activeRoomId, createRoom, ensureRoom, renameRoom } from "../lib/stores/rooms.ts";
  import { agents, addAgent } from "../lib/stores/agents.ts";
  import { activities } from "../lib/stores/activities.ts";
  import { selfName } from "../lib/stores/self.ts";
  import { reconnectWithName } from "../lib/ws-client.ts";
  import ActivityBadge from "./ActivityBadge.svelte";
  import SessionResumeDialog from "./SessionResumeDialog.svelte";
  import type { PastSession } from "@shared/types.ts";
  import { DEFAULT_ROOM } from "@shared/protocol.ts";

  let showNewRoom = $state(false);

  // ── room rename ──────────────────────────────────────────────────
  let editingRoomId = $state<string | null>(null);
  let roomLabelInput = $state("");

  function startRenameRoom(roomId: string, currentLabel: string) {
    editingRoomId = roomId;
    roomLabelInput = currentLabel;
  }

  function saveRoomName() {
    const trimmed = roomLabelInput.trim();
    if (trimmed && editingRoomId) renameRoom(editingRoomId, trimmed);
    editingRoomId = null;
  }

  // ── identity ─────────────────────────────────────────────────────
  let editingName = $state(false);
  let nameInput = $state("");

  function startEditName() {
    nameInput = $selfName;
    editingName = true;
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== $selfName) {
      selfName.set(trimmed);
      await window.coagent.setSelfName(trimmed);
      reconnectWithName(trimmed); // re-register with hub under new name
    }
    editingName = false;
  }
  let newRoomLabel = $state("");

  function submitNewRoom() {
    const label = newRoomLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || label;
    createRoom(id, label);
    activeRoomId.set(id);
    newRoomLabel = "";
    showNewRoom = false;
  }

  let addState = $state<"idle" | "picking-session">("idle");
  let pendingCwd = $state("");
  let pendingSessions = $state<PastSession[]>([]);
  let agentNameInput = $state("");
  let showAgentName = $state(false);
  let addTargetRoom = $state(DEFAULT_ROOM);

  async function addAgentToRoom(roomId: string) {
    addTargetRoom = roomId;
    const result = await window.coagent.pickFolder();
    if (!result.path) return;
    pendingCwd = result.path;
    const parts = result.path.replace(/\\/g, "/").split("/").filter(Boolean);
    agentNameInput = parts[parts.length - 1] ?? "agent";
    showAgentName = true;
  }

  async function confirmAgentName() {
    const name = agentNameInput.trim();
    if (!name) return;
    showAgentName = false;
    const { sessions } = await window.coagent.listSessions(pendingCwd);
    if (sessions.length > 0) {
      pendingSessions = sessions;
      addState = "picking-session";
    } else {
      await doSpawn(undefined);
    }
  }

  async function doSpawn(resumeSessionId: string | undefined) {
    addState = "idle";
    const name = agentNameInput.trim();
    const room = addTargetRoom;
    ensureRoom(room);
    addAgent({ name, cwd: pendingCwd, room, status: "starting" });
    activeRoomId.set(room);
    const res = await window.coagent.spawnAgent({ name, cwd: pendingCwd, room, resumeSessionId });
    if (!res.ok) console.error("spawn failed:", res.error);
  }

  function agentsInRoom(roomId: string) {
    return $agents.filter((a) => a.room === roomId);
  }
</script>

<nav class="sidebar" aria-label="Rooms">
  <div class="sidebar-header">
    <span class="sidebar-title">Workspace</span>
    <button class="icon-btn" onclick={() => { showNewRoom = !showNewRoom; newRoomLabel = ""; }} title="New room">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  {#if showNewRoom}
    <div class="inline-form">
      <input
        class="text-input"
        bind:value={newRoomLabel}
        placeholder="room-name"
        onkeydown={(e) => {
          if (e.key === "Enter") submitNewRoom();
          if (e.key === "Escape") { showNewRoom = false; }
        }}
      />
      <button class="submit-btn" onclick={submitNewRoom}>Create</button>
    </div>
  {/if}

  <div class="room-list" role="listbox" style="flex:1;overflow-y:auto">
    {#each $rooms as room (room.id)}
      {@const roomAgents = agentsInRoom(room.id)}
      {@const isActive = $activeRoomId === room.id}
      {@const runningCount = roomAgents.filter(a => a.status !== "exited").length}

      <div class="room-section">
        {#if editingRoomId === room.id}
          <div class="room-row active">
            <span class="room-chevron">▾</span>
            <input
              class="room-label-input"
              bind:value={roomLabelInput}
              onkeydown={(e) => {
                if (e.key === "Enter") saveRoomName();
                if (e.key === "Escape") editingRoomId = null;
              }}
              onblur={saveRoomName}
            />
          </div>
        {:else}
          <button
            class="room-row"
            class:active={isActive}
            onclick={() => activeRoomId.set(room.id)}
            ondblclick={() => startRenameRoom(room.id, room.label)}
            role="option"
            aria-selected={isActive}
            title="Double-click to rename"
          >
            <span class="room-chevron">{isActive ? "▾" : "▸"}</span>
            <span class="room-label"># {room.label}</span>
            {#if runningCount > 0}
              <span class="count-badge">{runningCount}</span>
            {/if}
          </button>
        {/if}

        {#if isActive}
          <div class="agent-section">
            {#each roomAgents as agent (agent.name)}
              <div class="agent-row" class:exited={agent.status === "exited"}>
                <span class="dot" class:running={agent.status === "running"} class:starting={agent.status === "starting"}></span>
                <span class="agent-name">{agent.name}</span>
                <span class="agent-activity"><ActivityBadge agentName={agent.name} /></span>
              </div>
            {/each}

            {#if showAgentName && addTargetRoom === room.id}
              <div class="agent-name-form">
                <p class="agent-name-label">Agent name</p>
                <div class="inline-form">
                  <input
                    class="text-input"
                    bind:value={agentNameInput}
                    placeholder="agent-name"
                    onkeydown={(e) => {
                      if (e.key === "Enter") confirmAgentName();
                      if (e.key === "Escape") showAgentName = false;
                    }}
                  />
                  <button class="submit-btn" onclick={confirmAgentName}>Add</button>
                </div>
              </div>
            {:else}
              <button class="add-agent-row" onclick={() => addAgentToRoom(room.id)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Add agent
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="identity">
    {#if editingName}
      <input
        class="name-input"
        bind:value={nameInput}
        onkeydown={(e) => {
          if (e.key === "Enter") saveName();
          if (e.key === "Escape") editingName = false;
        }}
        onblur={saveName}
      />
    {:else}
      <button class="name-btn" onclick={startEditName} title="클릭해서 이름 변경">
        <span class="name-avatar">{($selfName || "?")[0].toUpperCase()}</span>
        <span class="name-text">{$selfName || "—"}</span>
      </button>
    {/if}
  </div>
</nav>

{#if addState === "picking-session"}
  <SessionResumeDialog
    agentName={agentNameInput}
    cwd={pendingCwd}
    sessions={pendingSessions}
    onConfirm={(sid) => doSpawn(sid)}
    onCancel={() => { addState = "idle"; pendingSessions = []; }}
  />
{/if}

<style>
  .sidebar {
    width: 200px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    background: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sidebar-top-padding, 12px) 14px 10px;
    -webkit-app-region: drag;
    flex-shrink: 0;
  }
  .sidebar-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }
  .icon-btn {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    color: var(--text-muted);
    -webkit-app-region: no-drag;
    transition: color 0.1s, background 0.1s;
  }
  .icon-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

  .inline-form {
    display: flex;
    gap: 4px;
    padding: 0 8px 8px;
  }

  .agent-name-form {
    margin: 6px 8px 4px;
    border: 1px solid var(--border-mid);
    border-radius: 7px;
    overflow: hidden;
    background: var(--bg-input);
  }
  .agent-name-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding: 7px 8px 4px;
  }
  .agent-name-form .inline-form {
    padding: 0 6px 6px;
  }
  .text-input {
    flex: 1;
    min-width: 0;
    background: var(--bg-input);
    border: 1px solid var(--border-mid);
    border-radius: 4px;
    padding: 4px 7px;
    font: inherit;
    font-size: 11.5px;
    color: var(--text-primary);
    outline: none;
  }
  .text-input::placeholder { color: var(--text-placeholder); }
  .text-input:focus { border-color: var(--border-bright); }
  .submit-btn {
    padding: 4px 9px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: var(--bg-active);
    border: 1px solid var(--border-bright);
    color: var(--text-primary);
    flex-shrink: 0;
    transition: background 0.1s;
  }
  .submit-btn:hover { background: var(--bg-hover); }

  .room-list { flex: 1; overflow-y: auto; padding-bottom: 8px; }

  .room-row {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    text-align: left;
    padding: 6px 14px;
    transition: background 0.1s;
  }
  .room-row:hover { background: var(--bg-hover); }
  .room-row.active { background: var(--bg-active); }

  .room-chevron { font-size: 9px; color: var(--text-muted); width: 9px; flex-shrink: 0; }
  .room-label { font-size: 12.5px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .room-label-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-primary);
    padding: 0;
    min-width: 0;
  }
  .count-badge {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 5px;
    flex-shrink: 0;
    line-height: 1.7;
  }

  .agent-section { padding-bottom: 2px; }

  .agent-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 14px 4px 24px;
    transition: background 0.1s;
  }
  .agent-row:hover { background: var(--bg-hover); }
  .agent-row.exited { opacity: 0.35; }

  .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--border-bright);
    flex-shrink: 0;
  }
  .dot.starting { background: var(--text-muted); animation: pulse 1.2s ease-in-out infinite; }
  .dot.running { background: var(--text-secondary); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

  .agent-name {
    font-size: 11.5px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }
  .agent-activity { flex-shrink: 0; }

  .add-agent-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 14px 4px 24px;
    font-size: 11px;
    color: var(--text-muted);
    width: 100%;
    text-align: left;
    transition: color 0.1s, background 0.1s;
  }
  .add-agent-row:hover { color: var(--text-primary); background: var(--bg-hover); }

  .identity {
    border-top: 1px solid var(--border);
    padding: 8px;
    flex-shrink: 0;
  }
  .name-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 12px;
    transition: background 0.1s, color 0.1s;
  }
  .name-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .name-avatar {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--bg-active);
    border: 1px solid var(--border-mid);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600;
    flex-shrink: 0;
    color: var(--text-primary);
  }
  .name-text { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .name-input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border-bright);
    border-radius: 6px;
    padding: 6px 8px;
    font: inherit;
    font-size: 12px;
    color: var(--text-primary);
    outline: none;
  }
</style>
