<script lang="ts">
  import type { PastSession } from "@shared/types.ts";

  let { agentName, cwd, sessions, onConfirm, onCancel }: {
    agentName: string;
    cwd: string;
    sessions: PastSession[];
    onConfirm: (sid?: string) => void;
    onCancel: () => void;
  } = $props();

  let selected = $state<string | "fresh">("fresh");

  function fmtAgo(ms: number): string {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="dialog">
    <div class="dialog-header">
      <span class="dialog-title">Resume session?</span>
      <code class="dialog-cwd">{cwd}</code>
    </div>

    <div class="session-list" role="radiogroup">
      <label class="session-item" class:selected={selected === "fresh"}>
        <input type="radio" name="session" value="fresh" bind:group={selected} />
        <span class="session-label">Start fresh</span>
      </label>
      {#each sessions as s}
        <label class="session-item" class:selected={selected === s.sid}>
          <input type="radio" name="session" value={s.sid} bind:group={selected} />
          <span class="session-label">{s.preview || "(no preview)"}</span>
          <span class="session-meta">{fmtAgo(s.mtimeMs)} · ~{s.turns} turns</span>
        </label>
      {/each}
    </div>

    <div class="dialog-footer">
      <button class="btn-cancel" onclick={onCancel}>Cancel</button>
      <button class="btn-confirm" onclick={() => onConfirm(selected === "fresh" ? undefined : selected)}>
        {selected === "fresh" ? "Start fresh" : "Resume"}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(3px);
  }
  .dialog {
    background: var(--bg-panel);
    border: 1px solid var(--border-bright);
    border-radius: 12px;
    width: 440px;
    max-width: 90vw;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .dialog-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  .dialog-title { font-size: 14px; font-weight: 600; }
  .dialog-cwd { font-size: 10.5px; color: var(--text-muted); font-family: monospace; }
  .session-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 8px;
    gap: 2px;
  }
  .session-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 7px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.1s;
  }
  .session-item:hover { background: var(--bg-hover); }
  .session-item.selected { background: var(--bg-active); border-color: var(--border-bright); }
  .session-item input { accent-color: var(--text-primary); flex-shrink: 0; }
  .session-label { font-size: 12.5px; flex: 1; }
  .session-meta { font-size: 10.5px; color: var(--text-muted); flex-shrink: 0; }
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .btn-cancel {
    padding: 6px 14px; border-radius: 7px;
    font-size: 12.5px; color: var(--text-secondary);
    border: 1px solid var(--border-mid);
    background: var(--bg-input);
    transition: all 0.1s;
  }
  .btn-cancel:hover { border-color: var(--border-bright); color: var(--text-primary); }
  .btn-confirm {
    padding: 6px 14px; border-radius: 7px;
    font-size: 12.5px; font-weight: 600;
    background: var(--text-primary);
    color: var(--bg-base);
    transition: opacity 0.1s;
  }
  .btn-confirm:hover { opacity: 0.85; }
</style>
