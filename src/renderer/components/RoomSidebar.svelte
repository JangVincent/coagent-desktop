<script lang="ts">
  import { rooms, activeRoomId, createRoom, ensureRoom, renameRoom, deleteRoom } from "../lib/stores/rooms.ts";
  import { agents, addAgent, dropAgents } from "../lib/stores/agents.ts";
  import { dropRoom } from "../lib/stores/messages.ts";
  import { dropLogs } from "../lib/stores/agent-logs.ts";
  import { openTab, closeTab } from "../lib/stores/room-tabs.ts";
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
    openTab(id);
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
    openTab(room);
    const res = await window.coagent.spawnAgent({ name, cwd: pendingCwd, room, resumeSessionId });
    if (!res.ok) console.error("spawn failed:", res.error);
  }

  function agentsInRoom(roomId: string) {
    return $agents.filter((a) => a.room === roomId);
  }

  // ── room delete ──────────────────────────────────────────────────
  let confirmDeleteRoomId = $state<string | null>(null);

  async function performDeleteRoom(roomId: string) {
    if (roomId === DEFAULT_ROOM) return;
    const roomAgents = agentsInRoom(roomId);
    const names = new Set(roomAgents.map((a) => a.name));

    // Kill any live agents (utilityProcess.kill via IPC). The agent's
    // ws closes on exit and the hub broadcasts an updated roster.
    await Promise.all(
      roomAgents
        .filter((a) => a.status !== "exited")
        .map((a) => window.coagent.killAgent(a.name))
    );

    // Drop client-side state: chat history, log buffers, agent entries, room itself.
    dropRoom(roomId);
    for (const n of names) dropLogs(n);
    dropAgents(names);
    closeTab(roomId);
    deleteRoom(roomId);

    confirmDeleteRoomId = null;
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
        {:else if confirmDeleteRoomId === room.id}
          {@const liveCount = roomAgents.filter((a) => a.status !== "exited").length}
          <div class="room-row confirm">
            <span class="room-chevron">▾</span>
            <span class="confirm-text">
              Delete #{room.label}{liveCount > 0 ? ` (kill ${liveCount} agent${liveCount > 1 ? "s" : ""})` : ""}?
            </span>
            <button
              class="confirm-btn yes"
              onclick={(e) => { e.stopPropagation(); performDeleteRoom(room.id); }}
              title="Delete"
            >Delete</button>
            <button
              class="confirm-btn no"
              onclick={(e) => { e.stopPropagation(); confirmDeleteRoomId = null; }}
              title="Cancel"
            >Cancel</button>
          </div>
        {:else}
          <div class="room-row-wrap" class:active={isActive}>
            <button
              class="room-row"
              class:active={isActive}
              onclick={() => openTab(room.id)}
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
            {#if room.id !== DEFAULT_ROOM}
              <button
                class="room-delete"
                onclick={(e) => { e.stopPropagation(); confirmDeleteRoomId = room.id; }}
                title="Delete room"
                aria-label="Delete room"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 3h7M4.5 3V2a1 1 0 011-1h0a1 1 0 011 1v1M3 3l.5 6.5a1 1 0 001 .9h2a1 1 0 001-.9L8 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            {/if}
          </div>
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
    width: 220px;
    flex-shrink: 0;
    border-right: 1px solid var(--line-1);
    background: var(--bg-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sidebar-top-padding, 12px) var(--s-4) 12px;
    -webkit-app-region: drag;
    flex-shrink: 0;
  }
  .sidebar-title {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--tr-cap);
    color: var(--text-3);
  }
  .icon-btn {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--r-sm);
    color: var(--text-3);
    -webkit-app-region: no-drag;
    transition: color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
  }
  .icon-btn:hover { color: var(--text-1); background: var(--bg-4); }

  .inline-form {
    display: flex;
    gap: var(--s-1);
    padding: 0 var(--s-2) var(--s-2);
  }

  .agent-name-form {
    margin: 6px var(--s-2) 4px;
    border: 1px solid var(--line-2);
    border-radius: var(--r);
    overflow: hidden;
    background: var(--bg-2);
  }
  .agent-name-label {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--tr-cap);
    color: var(--text-3);
    padding: 8px 10px 4px;
  }
  .agent-name-form .inline-form {
    padding: 0 var(--s-2) var(--s-2);
  }
  .text-input {
    flex: 1;
    min-width: 0;
    background: var(--bg-3);
    border: 1px solid var(--line-2);
    border-radius: var(--r-sm);
    padding: 5px 8px;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--text-1);
    outline: none;
    transition: border-color var(--t-fast) var(--ease);
  }
  .text-input::placeholder { color: var(--text-4); }
  .text-input:focus { border-color: var(--accent-line); }
  .submit-btn {
    padding: 5px 10px;
    border-radius: var(--r-sm);
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    color: var(--accent-strong);
    flex-shrink: 0;
    transition: background var(--t-fast) var(--ease);
  }
  .submit-btn:hover { background: var(--accent-line); color: var(--text-1); }

  .room-list { flex: 1; overflow-y: auto; padding: 4px 0 var(--s-2); }

  .room-row-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .room-row-wrap:hover .room-delete { opacity: 1; }

  .room-row {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    text-align: left;
    padding: 6px 14px 6px 12px;
    border-left: 2px solid transparent;
    transition: background var(--t-fast) var(--ease),
                border-color var(--t-fast) var(--ease),
                color var(--t-fast) var(--ease);
  }
  .room-row:hover { background: var(--bg-4); }
  .room-row.active {
    background: var(--bg-2);
    border-left-color: var(--accent);
  }
  .room-row.active .room-label { color: var(--text-1); }
  .room-row.confirm {
    background: var(--danger-soft);
    border-left-color: var(--danger);
    gap: 6px;
    padding: 7px 8px 7px 12px;
  }

  .room-delete {
    position: absolute;
    right: var(--s-2);
    top: 50%;
    transform: translateY(-50%);
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--r-sm);
    color: var(--text-3);
    opacity: 0;
    transition: opacity var(--t-fast) var(--ease),
                color var(--t-fast) var(--ease),
                background var(--t-fast) var(--ease);
  }
  .room-delete:hover { color: var(--danger); background: var(--danger-soft); }

  .confirm-text {
    flex: 1;
    font-size: var(--fs-xs);
    color: var(--danger);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0;
  }
  .confirm-btn {
    padding: 3px 8px;
    border-radius: var(--r-sm);
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
    transition: opacity var(--t-fast) var(--ease),
                background var(--t-fast) var(--ease);
  }
  .confirm-btn.yes {
    background: var(--danger);
    color: var(--bg-0);
  }
  .confirm-btn.yes:hover { opacity: 0.86; }
  .confirm-btn.no {
    color: var(--text-2);
    border: 1px solid var(--line-2);
  }
  .confirm-btn.no:hover { color: var(--text-1); background: var(--bg-4); }

  .room-chevron {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-3);
    width: 9px;
    flex-shrink: 0;
    line-height: 1;
  }
  .room-label {
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--text-2);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.005em;
  }
  .room-label-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--text-1);
    padding: 0;
    min-width: 0;
  }
  .count-badge {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    color: var(--text-3);
    background: transparent;
    border: 1px solid var(--line-2);
    border-radius: 100px;
    padding: 0 6px;
    flex-shrink: 0;
    line-height: 1.7;
    font-variant-numeric: tabular-nums;
  }
  .room-row.active .count-badge {
    color: var(--accent);
    border-color: var(--accent-line);
    background: var(--accent-soft);
  }

  .agent-section { padding: 2px 0 4px; }

  .agent-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 14px 4px 26px;
    transition: background var(--t-fast) var(--ease);
  }
  .agent-row:hover { background: var(--bg-4); }
  .agent-row.exited { opacity: 0.35; }

  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--text-4);
    flex-shrink: 0;
    box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.06);
  }
  .dot.starting {
    background: var(--text-3);
    animation: pulse 1.4s var(--ease) infinite;
  }
  .dot.running {
    background: oklch(0.78 0.13 65);
    box-shadow: 0 0 0 0.5px oklch(0.78 0.13 65 / 0.4),
                0 0 8px oklch(0.78 0.13 65 / 0.35);
  }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.85); } }

  .agent-name {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-2);
    letter-spacing: 0;
  }
  .agent-activity { flex-shrink: 0; }

  .add-agent-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px 5px 26px;
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    text-transform: uppercase;
    letter-spacing: var(--tr-cap);
    color: var(--text-3);
    width: 100%;
    text-align: left;
    transition: color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
  }
  .add-agent-row:hover { color: var(--accent); background: var(--bg-4); }

  .identity {
    border-top: 1px solid var(--line-1);
    padding: var(--s-2);
    flex-shrink: 0;
    background: var(--bg-1);
  }
  .name-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border-radius: var(--r);
    color: var(--text-2);
    font-size: var(--fs-sm);
    transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  }
  .name-btn:hover { background: var(--bg-4); color: var(--text-1); }
  .name-avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: var(--bg-3);
    border: 1px solid var(--line-2);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: var(--fs-sm);
    flex-shrink: 0;
    color: var(--accent);
  }
  .name-text {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    color: var(--text-1);
    letter-spacing: 0;
  }
  .name-input {
    width: 100%;
    background: var(--bg-3);
    border: 1px solid var(--accent-line);
    border-radius: var(--r);
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--text-1);
    outline: none;
  }
</style>
