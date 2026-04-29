<script lang="ts">
  import { sendChat, sendControl } from "../lib/ws-client.ts";
  import { agents } from "../lib/stores/agents.ts";
  import { COMMANDS, completeSlash } from "../lib/slash-commands.ts";

  let { roomId }: { roomId: string } = $props();

  let text = $state("");
  let textarea: HTMLTextAreaElement;

  let roomAgentNames = $derived(
    $agents.filter((a) => a.room === roomId && a.status !== "exited").map((a) => a.name)
  );

  let showMention = $state(false);
  let mentionQuery = $state("");
  let mentionIdx = $state(0);
  let mentionSuggestions = $derived.by(() => {
    if (!showMention) return [];
    return [...roomAgentNames, "all"].filter((n) =>
      n.toLowerCase().startsWith(mentionQuery.toLowerCase())
    );
  });

  let showSlash = $state(false);
  let slashIdx = $state(0);
  let slashSuggestions = $derived.by(() => {
    if (!showSlash) return [];
    return COMMANDS.filter((c) => c.name.startsWith(text.slice(1)));
  });

  function detectPopup() {
    const val = textarea.value;
    const pos = textarea.selectionStart ?? val.length;
    const atMatch = val.slice(0, pos).match(/@([A-Za-z][A-Za-z0-9_-]*)$/);
    if (atMatch) {
      showMention = true; showSlash = false;
      mentionQuery = atMatch[1]; mentionIdx = 0;
      return;
    }
    if (val.startsWith("/") && !val.includes(" ")) {
      showSlash = true; showMention = false; slashIdx = 0;
      return;
    }
    showMention = false; showSlash = false;
  }

  function insertMention(name: string) {
    const pos = textarea.selectionStart ?? text.length;
    text = text.slice(0, pos).replace(/@([A-Za-z][A-Za-z0-9_-]*)$/, `@${name} `) + text.slice(pos);
    showMention = false;
    textarea.focus();
  }

  function insertSlash(name: string) {
    const cmd = COMMANDS.find((c) => c.name === name);
    text = `/${name}${cmd?.args ? " " : ""}`;
    showSlash = false;
    textarea.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showMention && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); mentionIdx = (mentionIdx + 1) % mentionSuggestions.length; return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); mentionIdx = (mentionIdx - 1 + mentionSuggestions.length) % mentionSuggestions.length; return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); insertMention(mentionSuggestions[mentionIdx]); return; }
      if (e.key === "Escape") { showMention = false; return; }
    }
    if (showSlash && slashSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); slashIdx = (slashIdx + 1) % slashSuggestions.length; return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); slashIdx = (slashIdx - 1 + slashSuggestions.length) % slashSuggestions.length; return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); insertSlash(slashSuggestions[slashIdx].name); return; }
      if (e.key === "Escape") { showSlash = false; return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.altKey) { e.preventDefault(); submit(); return; }
    if (e.key === "Tab" && !showMention && !showSlash) {
      e.preventDefault();
      const completed = completeSlash(text, roomAgentNames);
      if (completed) text = completed;
    }
  }

  function parseSlash(input: string): { op: string; target: string; arg?: string } | null {
    const m = input.match(/^\/([a-z]+)\s+([a-z][a-z0-9_-]*)(?:\s+(.+))?$/i);
    return m ? { op: m[1], target: m[2], arg: m[3] } : null;
  }

  function submit() {
    const val = text.trim();
    if (!val) return;
    if (val.startsWith("/")) {
      const p = parseSlash(val);
      if (p) sendControl(p.target, p.op, p.arg);
    } else {
      sendChat(val);
    }
    text = "";
    showMention = false;
    showSlash = false;
    textarea.style.height = "auto";
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer?.files ?? [])
      .map((f) => (f as any).path as string)
      .filter(Boolean);
    if (!paths.length) return;
    const pos = textarea.selectionStart ?? text.length;
    text = text.slice(0, pos) + paths.join(" ") + " " + text.slice(pos);
  }

  function autoResize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + "px";
  }

  let placeholder = $derived(
    roomAgentNames.length > 0
      ? `Message — @${roomAgentNames[0]}`
      : "Add an agent to start chatting"
  );
</script>

<div class="composer-wrap">
  {#if showMention && mentionSuggestions.length > 0}
    <div class="popup" role="listbox">
      {#each mentionSuggestions as s, i}
        <button class="popup-item" class:focused={i === mentionIdx} onclick={() => insertMention(s)} role="option" aria-selected={i === mentionIdx}>
          <span class="popup-at">@</span>{s}
        </button>
      {/each}
    </div>
  {/if}

  {#if showSlash && slashSuggestions.length > 0}
    <div class="popup" role="listbox">
      {#each slashSuggestions as s, i}
        <button class="popup-item" class:focused={i === slashIdx} onclick={() => insertSlash(s.name)} role="option" aria-selected={i === slashIdx}>
          <span class="popup-slash">/{s.name}</span>
          <span class="popup-desc">{s.desc}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="input-row">
    <textarea
      bind:this={textarea}
      bind:value={text}
      {placeholder}
      rows={1}
      onkeydown={handleKeydown}
      oninput={() => { detectPopup(); autoResize(); }}
      ondrop={handleDrop}
      ondragover={(e) => e.preventDefault()}
      disabled={roomAgentNames.length === 0}
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
    ></textarea>
    <button
      class="send-btn"
      onclick={submit}
      disabled={!text.trim() || roomAgentNames.length === 0}
      aria-label="Send"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M13 7L1 1l2 6-2 6 12-6z"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .composer-wrap {
    position: relative;
    padding: 10px 16px 14px;
    background: var(--bg-panel);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-input);
    border: 1px solid var(--border-mid);
    border-radius: 10px;
    padding: 8px 10px;
    transition: border-color 0.15s;
  }
  .input-row:focus-within { border-color: var(--border-bright); }

  textarea {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    resize: none;
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    line-height: 1.55;
    min-height: 22px;
    max-height: 180px;
    overflow-y: auto;
    padding: 0;
  }
  textarea::placeholder { color: var(--text-placeholder); }
  textarea:disabled { cursor: not-allowed; }

  .send-btn {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 7px;
    background: var(--bg-active);
    border: 1px solid var(--border-bright);
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .send-btn:hover:not(:disabled) {
    background: var(--text-primary);
    color: var(--bg-base);
    border-color: var(--text-primary);
  }
  .send-btn:disabled { opacity: 0.25; cursor: default; }

  .popup {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 16px; right: 16px;
    background: var(--bg-panel);
    border: 1px solid var(--border-bright);
    border-radius: 8px;
    overflow: hidden;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: var(--shadow);
    z-index: 50;
  }
  .popup-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 7px 12px;
    font-size: 12.5px;
    color: var(--text-secondary);
    transition: background 0.1s;
  }
  .popup-item:hover, .popup-item.focused { background: var(--bg-active); color: var(--text-primary); }
  .popup-at { font-weight: 700; color: var(--text-muted); }
  .popup-slash { font-family: monospace; font-weight: 700; color: var(--text-primary); flex-shrink: 0; }
  .popup-desc { color: var(--text-muted); font-size: 11px; }
</style>
