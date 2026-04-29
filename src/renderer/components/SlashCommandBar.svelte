<script lang="ts">
  import { sendControl } from "../lib/ws-client.ts";
  import { agents } from "../lib/stores/agents.ts";
  import ModeToggle from "./ModeToggle.svelte";
  import ModelPicker from "./ModelPicker.svelte";
  import ActivityBadge from "./ActivityBadge.svelte";

  let { roomId }: { roomId: string } = $props();

  let roomAgents = $derived(
    $agents.filter((a) => a.room === roomId && a.status !== "exited")
  );
  let selectedAgent = $state<string | null>(null);
  let activeAgent = $derived(
    selectedAgent ?? roomAgents.find((a) => a.status === "running")?.name ?? roomAgents[0]?.name ?? null
  );

  let paused = $state(false);
  let confirmKill = $state(false);
  let confirmClear = $state(false);

  function send(op: string, arg?: string) {
    if (activeAgent) sendControl(activeAgent, op, arg);
  }

  function togglePause() {
    paused = !paused;
    send(paused ? "pause" : "resume");
  }
</script>

{#if roomAgents.length > 0}
  <div class="bar">
    {#if roomAgents.length > 1}
      <div class="agent-tabs">
        {#each roomAgents as a (a.name)}
          <button
            class="agent-tab"
            class:active={a.name === activeAgent}
            onclick={() => { selectedAgent = a.name; paused = false; }}
          >
            {a.name}
            <ActivityBadge agentName={a.name} />
          </button>
        {/each}
      </div>
    {/if}

    {#if confirmKill}
      <div class="confirm-row">
        <span class="confirm-msg">Kill <strong>{activeAgent}</strong>?</span>
        <button class="btn danger" onclick={() => { send("kill"); confirmKill = false; }}>Kill</button>
        <button class="btn ghost" onclick={() => (confirmKill = false)}>Cancel</button>
      </div>
    {:else if confirmClear}
      <div class="confirm-row">
        <span class="confirm-msg">Clear session for <strong>{activeAgent}</strong>?</span>
        <button class="btn danger" onclick={() => { send("clear"); confirmClear = false; }}>Clear</button>
        <button class="btn ghost" onclick={() => (confirmClear = false)}>Cancel</button>
      </div>
    {:else}
      <div class="controls">
        <div class="group">
          <button class="btn ghost" onclick={() => (confirmClear = true)}>/clear</button>
          <button class="btn ghost" onclick={() => send("compact")}>/compact</button>
          <button class="btn ghost" onclick={() => send("status")}>/status</button>
          <button class="btn ghost" onclick={() => send("usage")}>/usage</button>
        </div>
        <div class="group">
          <button class="btn ghost" class:active={paused} onclick={togglePause}>
            {paused ? "▶ resume" : "⏸ pause"}
          </button>
        </div>
        {#if activeAgent}
          <div class="group right">
            <ModeToggle agentName={activeAgent} />
            <ModelPicker agentName={activeAgent} />
            <button class="btn ghost kill" onclick={() => (confirmKill = true)}>✕</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .bar {
    border-top: 1px solid var(--border);
    background: var(--bg-panel);
    flex-shrink: 0;
  }
  .agent-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    padding: 0 12px;
  }
  .agent-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    font-size: 11.5px;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.1s, border-color 0.1s;
    white-space: nowrap;
  }
  .agent-tab:hover { color: var(--text-secondary); }
  .agent-tab.active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    flex-wrap: wrap;
  }
  .confirm-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
  }
  .confirm-msg { font-size: 12px; color: var(--text-secondary); flex: 1; }
  .confirm-msg strong { color: var(--text-primary); }

  .group { display: flex; align-items: center; gap: 2px; }
  .right { margin-left: auto; }

  .btn {
    padding: 4px 9px;
    border-radius: 5px;
    font-size: 11.5px;
    font-weight: 500;
    transition: all 0.1s;
  }
  .btn.ghost { color: var(--text-muted); }
  .btn.ghost:hover, .btn.ghost.active { background: var(--bg-active); color: var(--text-primary); }
  .btn.kill { color: var(--text-muted); }
  .btn.kill:hover { color: var(--danger); background: var(--danger-bg); }
  .btn.danger {
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid var(--danger-border);
  }
  .btn.danger:hover { opacity: 0.85; }
</style>
