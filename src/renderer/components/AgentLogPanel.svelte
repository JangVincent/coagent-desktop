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
    width: 520px;
    max-height: 320px;
    background: var(--bg-base);
    border: 1px solid var(--border-bright);
    border-radius: 10px 0 0 0;
    display: flex;
    flex-direction: column;
    z-index: 500;
    box-shadow: var(--shadow);
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-title { font-size: 11px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.06em; text-transform: uppercase; }
  .panel-actions { display: flex; gap: 6px; }
  .panel-actions button {
    font-size: 11px;
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.1s;
  }
  .panel-actions button:hover { background: var(--bg-hover); color: var(--text-primary); }

  .log-area {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 11px;
    line-height: 1.6;
  }
  .log-line {
    display: flex;
    gap: 10px;
    padding: 1px 12px;
  }
  .log-line:hover { background: var(--bg-hover); }
  .log-line.stderr { color: var(--danger); }
  .log-ts { color: var(--text-muted); flex-shrink: 0; }
  .log-text { color: var(--text-secondary); word-break: break-all; white-space: pre-wrap; }
  .stderr .log-text { color: var(--danger); }
  .empty { color: var(--text-muted); padding: 12px; font-size: 11px; text-align: center; }
</style>
