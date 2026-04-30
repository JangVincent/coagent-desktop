<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { rooms, activeRoomId } from "../lib/stores/rooms.ts";
  import { openRoomIds, closeTab } from "../lib/stores/room-tabs.ts";
  import { agents } from "../lib/stores/agents.ts";
  import { DEFAULT_ROOM } from "@shared/protocol.ts";
  import ThemeToggle from "./ThemeToggle.svelte";

  // macOS uses Cmd, others use Ctrl — same as browser tab switching convention.
  const isMac = typeof navigator !== "undefined" && /Macintosh|Mac OS X/i.test(navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  // Resolve open ids to actual room specs (skip ids whose room was deleted).
  let openTabs = $derived(
    $openRoomIds
      .map((id) => $rooms.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => !!r),
  );

  function liveAgentCount(roomId: string): number {
    return $agents.filter((a) => a.room === roomId && a.status !== "exited").length;
  }

  function shortcutFor(index: number): string | null {
    // Browser convention: 1..8 jump to that tab; 9 jumps to the LAST tab.
    if (index < 0) return null;
    if (index < 8) return `${modKey}${index + 1}`;
    return null;
  }

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      // Skip while IME composition is active.
      if (e.isComposing) return;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.shiftKey || e.altKey) return;

      // Only respect "wrong" modifier (Ctrl on mac, Meta elsewhere) by ignoring it.
      if (isMac && e.ctrlKey) return;
      if (!isMac && e.metaKey) return;

      // Map "1".."9" — 9 jumps to last tab (browser-style).
      if (!/^[1-9]$/.test(e.key)) return;
      const ids = get(openRoomIds);
      if (ids.length === 0) return;
      e.preventDefault();
      const target = e.key === "9"
        ? ids[ids.length - 1]
        : ids[Math.min(parseInt(e.key, 10) - 1, ids.length - 1)];
      if (target) activeRoomId.set(target);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

<header class="tab-header">
  <div class="drag-pad" aria-hidden="true"></div>

  <div class="tabs" role="tablist">
    {#each openTabs as room, i (room.id)}
      {@const active = $activeRoomId === room.id}
      {@const count = liveAgentCount(room.id)}
      {@const shortcut = shortcutFor(i)}
      <div
        class="tab"
        class:active
        role="tab"
        aria-selected={active}
        tabindex="0"
        title={shortcut ? `# ${room.label} · ${shortcut}` : `# ${room.label}`}
        onclick={() => activeRoomId.set(room.id)}
        onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") activeRoomId.set(room.id); }}
      >
        <span class="hash">#</span>
        <span class="label">{room.label}</span>
        {#if count > 0}
          <span class="count">{count}</span>
        {/if}
        {#if room.id !== DEFAULT_ROOM}
          <button
            class="close"
            onclick={(e) => { e.stopPropagation(); closeTab(room.id); }}
            title="Close tab"
            aria-label="Close tab"
            tabindex="-1"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="actions">
    <ThemeToggle />
  </div>
</header>

<style>
  .tab-header {
    display: flex;
    align-items: stretch;
    height: 40px;
    padding: 0 var(--s-3) 0 0;
    border-bottom: 1px solid var(--line-1);
    background: var(--bg-2);
    -webkit-app-region: drag;
    flex-shrink: 0;
    overflow: hidden;
  }

  /* Stays as draggable region for window movement. width = ~80 covers
     macOS traffic-light area when sidebar is collapsed; on normal layout
     the sidebar provides the drag region, so this only needs a small pad. */
  .drag-pad {
    width: 8px;
    flex-shrink: 0;
  }

  .tabs {
    display: flex;
    align-items: stretch;
    gap: 1px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-app-region: no-drag;
    padding: 6px 0 0;
    min-width: 0;
  }
  .tabs::-webkit-scrollbar { height: 0; }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 100%;
    padding: 0 10px 0 12px;
    background: transparent;
    color: var(--text-3);
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: var(--r) var(--r) 0 0;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    letter-spacing: 0;
    white-space: nowrap;
    flex-shrink: 0;
    max-width: 200px;
    cursor: pointer;
    user-select: none;
    transition: background var(--t-fast) var(--ease),
                color var(--t-fast) var(--ease),
                border-color var(--t-fast) var(--ease);
    position: relative;
  }
  .tab:hover {
    background: var(--bg-3);
    color: var(--text-2);
  }
  .tab.active {
    background: var(--bg-0);
    color: var(--text-1);
    border-color: var(--line-2);
  }
  .tab.active::after {
    content: "";
    position: absolute;
    left: 0; right: 0;
    bottom: -1px;
    height: 1px;
    background: var(--bg-0);
  }
  .tab.active::before {
    content: "";
    position: absolute;
    top: 0; left: 10px; right: 10px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 1px;
  }

  .hash {
    color: var(--text-3);
    font-weight: 500;
  }
  .tab.active .hash { color: var(--accent); }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .count {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    color: var(--text-3);
    background: var(--bg-3);
    border: 1px solid var(--line-1);
    border-radius: 100px;
    padding: 0 6px;
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
  }
  .tab.active .count {
    color: var(--accent);
    border-color: var(--accent-line);
    background: var(--accent-soft);
  }

  .close {
    width: 16px; height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-sm);
    color: var(--text-3);
    opacity: 0;
    margin-left: -2px;
    transition: opacity var(--t-fast) var(--ease),
                color var(--t-fast) var(--ease),
                background var(--t-fast) var(--ease);
  }
  .tab:hover .close,
  .tab.active .close { opacity: 1; }
  .close:hover {
    color: var(--text-1);
    background: var(--bg-4);
  }

  .actions {
    display: flex;
    align-items: center;
    -webkit-app-region: no-drag;
    padding-left: var(--s-2);
    border-left: 1px solid var(--line-1);
    margin-left: var(--s-2);
  }
</style>
