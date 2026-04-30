<script lang="ts">
  import { pushDropPaths } from "../lib/stores/drop.ts";

  let { children }: { children: import("svelte").Snippet } = $props();

  let dragDepth = $state(0);
  let isDragging = $derived(dragDepth > 0);

  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
  }

  function onDragOver(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth = 0;

    const paths: string[] = [];

    // Electron 28+: use webUtils.getPathForFile (exposed via preload)
    if (e.dataTransfer?.files.length) {
      for (const file of Array.from(e.dataTransfer.files)) {
        try {
          const p = window.coagent.getFilePath(file);
          if (p) paths.push(p);
        } catch {
          // fallback for older Electron / non-file drops
          const p = (file as any).path as string | undefined;
          if (p) paths.push(p);
        }
      }
    }

    if (paths.length) pushDropPaths(paths);
  }

  function hasFiles(e: DragEvent): boolean {
    return Array.from(e.dataTransfer?.types ?? []).includes("Files");
  }
</script>

<div
  class="dropzone"
  class:dragging={isDragging}
  ondragenter={onDragEnter}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  role="region"
  aria-label="Chat area — drop files or folders to insert path"
>
  {@render children()}

  {#if isDragging}
    <div class="drop-overlay" aria-hidden="true">
      <div class="drop-hint">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M16 4v16M8 12l8 8 8-8"/>
          <path d="M4 24h24"/>
        </svg>
        <span>Drop to insert path</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .dropzone {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in oklch, var(--bg-0), transparent 6%);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    pointer-events: none;
    border: 1.5px dashed var(--accent-line);
    border-radius: var(--r-lg);
    margin: 12px;
    animation: drop-in 180ms var(--ease);
  }
  @keyframes drop-in {
    from { opacity: 0; transform: scale(0.99); }
    to   { opacity: 1; transform: scale(1); }
  }

  .drop-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    color: var(--accent);
  }

  .drop-hint span {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--fs-xl);
    color: var(--text-1);
    letter-spacing: -0.005em;
  }
</style>
