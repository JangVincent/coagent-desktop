<script lang="ts">
  import { onMount } from "svelte";

  let {
    x, y,
    agentName,
    onClose,
    onShowLogs,
  }: {
    x: number;
    y: number;
    agentName: string;
    onClose: () => void;
    onShowLogs?: () => void;
  } = $props();

  import { sendControl } from "../lib/ws-client.ts";

  let paused = $state(false);
  let showModeMenu = $state(false);
  let showModelMenu = $state(false);
  let confirmKill = $state(false);
  let confirmClear = $state(false);
  let menu: HTMLElement;

  // Clamp position so menu doesn't go off screen
  let left = $derived(Math.min(x, window.innerWidth - 220));
  let top = $derived(Math.min(y, window.innerHeight - 320));

  function send(op: string, arg?: string) {
    sendControl(agentName, op, arg);
    onClose();
  }

  function togglePause() {
    paused = !paused;
    sendControl(agentName, paused ? "pause" : "resume");
    onClose();
  }

  onMount(() => {
    const handler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Small delay so the triggering right-click doesn't immediately close
    setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", keyHandler);
    }, 50);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  });

  const modes = [
    { value: "default", label: "Ask (default)" },
    { value: "acceptEdits", label: "Accept edits" },
    { value: "bypassPermissions", label: "Auto (bypass)" },
    { value: "plan", label: "Plan" },
  ];

  const models = [
    { id: "default", label: "Default" },
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { id: "claude-opus-4-7", label: "Opus 4.7" },
  ];
</script>

<div class="menu" bind:this={menu} style:left="{left}px" style:top="{top}px" role="menu">
  <div class="menu-header">{agentName}</div>

  {#if confirmKill}
    <div class="confirm-section">
      <span class="confirm-label">Kill agent?</span>
      <div class="confirm-btns">
        <button class="confirm-yes" onclick={() => send("kill")}>Kill</button>
        <button class="confirm-no" onclick={() => { confirmKill = false; }}>Cancel</button>
      </div>
    </div>
  {:else if confirmClear}
    <div class="confirm-section">
      <span class="confirm-label">Clear session?</span>
      <div class="confirm-btns">
        <button class="confirm-yes" onclick={() => send("clear")}>Clear</button>
        <button class="confirm-no" onclick={() => { confirmClear = false; }}>Cancel</button>
      </div>
    </div>
  {:else if showModeMenu}
    <button class="item back" onclick={() => (showModeMenu = false)}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L3 5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Back
    </button>
    <div class="divider"></div>
    {#each modes as m}
      <button class="item" onclick={() => send("mode", m.value)}>{m.label}</button>
    {/each}
  {:else if showModelMenu}
    <button class="item back" onclick={() => (showModelMenu = false)}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L3 5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Back
    </button>
    <div class="divider"></div>
    {#each models as m}
      <button class="item" onclick={() => send("model", m.id)}>{m.label}</button>
    {/each}
  {:else}
    <button class="item" onclick={togglePause}>
      {paused ? "▶ Resume" : "⏸ Pause"}
    </button>
    <div class="divider"></div>
    <button class="item" onclick={() => send("status")}>/status</button>
    <button class="item" onclick={() => send("usage")}>/usage</button>
    <button class="item" onclick={() => send("compact")}>/compact</button>
    <button class="item" onclick={() => { confirmClear = true; }}>
      /clear session
    </button>
    <div class="divider"></div>
    <button class="item submenu" onclick={() => (showModeMenu = true)}>
      Set mode
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 1l4 3.5L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
    <button class="item submenu" onclick={() => (showModelMenu = true)}>
      Set model
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 1l4 3.5L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
    <div class="divider"></div>
    <button class="item danger" onclick={() => { confirmKill = true; }}>/kill</button>
    <div class="divider"></div>
    <button class="item logs" onclick={() => { onShowLogs?.(); onClose(); }}>Show logs</button>
  {/if}
</div>

<style>
  .menu {
    position: fixed;
    z-index: 9999;
    background: var(--bg-panel);
    border: 1px solid var(--border-bright);
    border-radius: 9px;
    padding: 4px;
    min-width: 180px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
  }

  .menu-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 5px 10px 6px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 3px 0;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 12.5px;
    color: var(--text-secondary);
    transition: background 0.1s, color 0.1s;
    font-family: ui-monospace, monospace;
  }
  .item:hover { background: var(--bg-hover); color: var(--text-primary); }

  .item.back { color: var(--text-muted); font-family: inherit; font-size: 12px; }
  .item.back:hover { color: var(--text-primary); }

  .item.submenu { justify-content: space-between; font-family: inherit; }

  .item.danger { color: var(--danger); }
  .item.danger:hover { background: var(--danger-bg); }
  .item.logs { color: var(--text-muted); font-family: inherit; font-size: 12px; }
  .item.logs:hover { color: var(--text-primary); }

  .confirm-section {
    padding: 6px 8px 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .confirm-label { font-size: 12px; color: var(--text-secondary); padding: 0 2px; }
  .confirm-btns { display: flex; gap: 4px; }
  .confirm-yes {
    flex: 1;
    padding: 5px;
    border-radius: 5px;
    font-size: 12px;
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid var(--danger-border);
    transition: opacity 0.1s;
  }
  .confirm-yes:hover { opacity: 0.8; }
  .confirm-no {
    flex: 1;
    padding: 5px;
    border-radius: 5px;
    font-size: 12px;
    background: var(--bg-active);
    color: var(--text-secondary);
    border: 1px solid var(--border-mid);
  }
  .confirm-no:hover { color: var(--text-primary); }
</style>
