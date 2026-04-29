<script lang="ts">
  import { sendControl } from "../lib/ws-client.ts";

  let { agentName }: { agentName: string } = $props();

  const modes = [
    { value: "default", label: "Ask" },
    { value: "acceptEdits", label: "Edit" },
    { value: "bypassPermissions", label: "Auto" },
    { value: "plan", label: "Plan" },
  ];

  let selected = $state("bypassPermissions");

  function setMode(mode: string) {
    selected = mode;
    sendControl(agentName, "mode", mode);
  }
</script>

<div class="toggle-group" role="group">
  {#each modes as m}
    <button
      class="mode-btn"
      class:active={selected === m.value}
      onclick={() => setMode(m.value)}
      title={m.value}
    >
      {m.label}
    </button>
  {/each}
</div>

<style>
  .toggle-group {
    display: flex;
    gap: 1px;
    background: var(--bg-input);
    border: 1px solid var(--border-mid);
    border-radius: 5px;
    padding: 2px;
  }
  .mode-btn {
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 10.5px;
    font-weight: 500;
    color: var(--text-muted);
    transition: all 0.1s;
    letter-spacing: 0.01em;
  }
  .mode-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
  .mode-btn.active { background: var(--bg-active); color: var(--text-primary); border: 1px solid var(--border-bright); }
</style>
