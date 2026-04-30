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
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(6px);
    animation: overlay-in 180ms var(--ease);
  }
  @keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }

  .dialog {
    background: var(--bg-2);
    border: 1px solid var(--line-3);
    border-radius: var(--r-xl);
    width: 480px;
    max-width: 90vw;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-modal);
    overflow: hidden;
    animation: dialog-in 220ms var(--ease);
  }
  @keyframes dialog-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .dialog-header {
    padding: 22px 24px 16px;
    border-bottom: 1px solid var(--line-1);
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }
  .dialog-title {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--fs-xl);
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.005em;
  }
  .dialog-cwd {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    color: var(--text-3);
    letter-spacing: 0;
  }
  .session-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: var(--s-2);
    gap: 2px;
  }
  .session-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--r);
    border-left: 2px solid transparent;
    cursor: pointer;
    transition: background var(--t-fast) var(--ease),
                border-color var(--t-fast) var(--ease);
  }
  .session-item:hover { background: var(--bg-3); }
  .session-item.selected {
    background: var(--accent-soft);
    border-left-color: var(--accent);
  }
  .session-item input {
    appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1.5px solid var(--line-3);
    flex-shrink: 0;
    transition: all var(--t-fast) var(--ease);
    cursor: pointer;
    position: relative;
  }
  .session-item input:checked {
    border-color: var(--accent);
  }
  .session-item input:checked::after {
    content: "";
    position: absolute;
    inset: 2.5px;
    border-radius: 50%;
    background: var(--accent);
  }
  .session-label {
    font-size: var(--fs-sm);
    flex: 1;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .session-meta {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    color: var(--text-3);
    flex-shrink: 0;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
    padding: var(--s-3) var(--s-4);
    border-top: 1px solid var(--line-1);
    flex-shrink: 0;
  }
  .btn-cancel {
    padding: 7px 14px;
    border-radius: var(--r);
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-2);
    border: 1px solid var(--line-2);
    background: transparent;
    transition: all var(--t-fast) var(--ease);
  }
  .btn-cancel:hover { border-color: var(--line-3); color: var(--text-1); }
  .btn-confirm {
    padding: 7px 16px;
    border-radius: var(--r);
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--accent);
    color: var(--bg-0);
    transition: background var(--t-fast) var(--ease);
  }
  .btn-confirm:hover { background: var(--accent-strong); }
</style>
