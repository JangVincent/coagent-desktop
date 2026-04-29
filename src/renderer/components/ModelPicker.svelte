<script lang="ts">
  import { sendControl } from "../lib/ws-client.ts";

  let { agentName }: { agentName: string } = $props();

  const models = [
    { id: "default", label: "Default" },
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { id: "claude-opus-4-7", label: "Opus 4.7" },
  ];

  let selected = $state("default");
  let open = $state(false);

  function pick(id: string) {
    selected = id;
    open = false;
    sendControl(agentName, "model", id);
  }

  let label = $derived(models.find((m) => m.id === selected)?.label ?? selected);
</script>

<div class="picker">
  <button class="trigger" onclick={() => (open = !open)} title="Model">
    {label}
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1 2.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  </button>
  {#if open}
    <div class="dropdown" role="menu">
      {#each models as m}
        <button
          class="item"
          class:selected={selected === m.id}
          onclick={() => pick(m.id)}
          role="menuitem"
        >
          {m.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .picker { position: relative; }
  .trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 5px;
    border: 1px solid var(--border-mid);
    background: var(--bg-input);
    font-size: 10.5px;
    color: var(--text-muted);
    transition: all 0.1s;
  }
  .trigger:hover { color: var(--text-primary); border-color: var(--border-bright); }
  .dropdown {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    background: var(--bg-panel);
    border: 1px solid var(--border-bright);
    border-radius: 7px;
    overflow: hidden;
    min-width: 120px;
    box-shadow: var(--shadow);
    z-index: 100;
  }
  .item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 11px;
    font-size: 12px;
    color: var(--text-secondary);
    transition: background 0.1s;
  }
  .item:hover { background: var(--bg-hover); color: var(--text-primary); }
  .item.selected { color: var(--text-primary); font-weight: 600; }
</style>
