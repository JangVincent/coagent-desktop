<script lang="ts">
  import { agentLogs, clearLogs } from "../lib/stores/agent-logs.ts";

  let { agentName, onClose }: { agentName: string; onClose: () => void } = $props();

  let logs = $derived($agentLogs.get(agentName) ?? []);
  let viewport: HTMLElement;

  $effect(() => {
    void logs.length;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  });

  function fmt(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<div class="panel" role="dialog" aria-label="Agent logs">
  <div class="panel-header">
    <span class="panel-title">Logs — {agentName}</span>
    <div class="panel-actions">
      <button onclick={() => clearLogs(agentName)} title="Clear">Clear</button>
      <button onclick={onClose} title="Close">✕</button>
    </div>
  </div>

  <div class="log-area" bind:this={viewport}>
    {#if logs.length === 0}
      <p class="empty">No logs yet.</p>
    {/if}
    {#each logs as line}
      <div class="log-line" class:stderr={line.stream === "stderr"}>
        <span class="log-ts">{fmt(line.ts)}</span>
        <span class="log-text">{line.text}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .panel {
    position: fixed;
    bottom: 0; right: 0;
    width: 560px;
    max-height: 360px;
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-bottom: none;
    border-right: none;
    border-radius: var(--r-lg) 0 0 0;
    display: flex;
    flex-direction: column;
    z-index: 500;
    box-shadow: var(--shadow-panel);
    animation: panel-in 220ms var(--ease);
  }
  @keyframes panel-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line-1);
    flex-shrink: 0;
  }
  .panel-title {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 500;
    color: var(--text-3);
    letter-spacing: var(--tr-cap);
    text-transform: uppercase;
  }
  .panel-actions { display: flex; gap: 4px; }
  .panel-actions button {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-3);
    padding: 4px 8px;
    border-radius: var(--r-sm);
    transition: all var(--t-fast) var(--ease);
  }
  .panel-actions button:hover { background: var(--bg-4); color: var(--text-1); }

  .log-area {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    line-height: 1.7;
    background: var(--bg-0);
  }
  .log-line {
    display: flex;
    gap: 12px;
    padding: 1px 14px;
    transition: background var(--t-fast) var(--ease);
  }
  .log-line:hover { background: var(--bg-3); }
  .log-line.stderr { color: var(--danger); }
  .log-ts {
    color: var(--text-4);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
  .log-text {
    color: var(--text-2);
    word-break: break-all;
    white-space: pre-wrap;
    letter-spacing: 0;
  }
  .stderr .log-text { color: var(--danger); }
  .empty {
    color: var(--text-3);
    padding: 24px;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--fs-sm);
    text-align: center;
  }
</style>
