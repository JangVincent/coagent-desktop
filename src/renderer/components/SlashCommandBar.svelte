<script lang="ts">
  import { agents } from "../lib/stores/agents.ts";
  import { nameColor } from "../lib/name-color.ts";
  import ActivityBadge from "./ActivityBadge.svelte";
  import ContextMenu from "./ContextMenu.svelte";

  let { roomId }: { roomId: string } = $props();

  let roomAgents = $derived(
    $agents.filter((a) => a.room === roomId && a.status !== "exited")
  );

  let selectedAgent = $state<string | null>(null);
  let activeAgent = $derived(
    selectedAgent ?? roomAgents.find((a) => a.status === "running")?.name ?? roomAgents[0]?.name ?? null
  );

  // Context menu state
  let menuAgent = $state<string | null>(null);
  let menuX = $state(0);
  let menuY = $state(0);

  function openMenu(e: MouseEvent, agentName: string) {
    e.preventDefault();
    menuAgent = agentName;
    menuX = e.clientX;
    menuY = e.clientY;
  }
</script>

{#if roomAgents.length > 0}
  <div class="tab-bar">
    {#each roomAgents as a (a.name)}
      <button
        class="tab"
        class:active={a.name === activeAgent}
        onclick={() => { selectedAgent = a.name; }}
        oncontextmenu={(e) => openMenu(e, a.name)}
        style:--agent-color={nameColor(a.name)}
        title="Right-click for options"
      >
        <span class="tab-dot"></span>
        <span class="tab-name">{a.name}</span>
        <ActivityBadge agentName={a.name} />
      </button>
    {/each}
  </div>
{/if}

{#if menuAgent}
  <ContextMenu
    x={menuX}
    y={menuY}
    agentName={menuAgent}
    onClose={() => (menuAgent = null)}
  />
{/if}

<style>
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 14px;
    border-top: 1px solid var(--border);
    background: var(--bg-panel);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    font-size: 12px;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.1s, border-color 0.1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .tab:hover { color: var(--agent-color); }
  .tab.active {
    color: var(--agent-color);
    border-bottom-color: var(--agent-color);
  }

  .tab-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--agent-color);
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.1s;
  }
  .tab.active .tab-dot { opacity: 1; }

  .tab-name { font-weight: 500; }
</style>
