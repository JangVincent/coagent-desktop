<script lang="ts">
  import { messages } from "../lib/stores/messages.ts";
  import { selfName } from "../lib/stores/self.ts";
  import MarkdownMessage from "./MarkdownMessage.svelte";
  import { nameColor } from "../lib/name-color.ts";
  import { tick } from "svelte";

  let { roomId }: { roomId: string } = $props();

  let allMessages = $derived($messages);
  let chatList = $derived(allMessages.get(roomId) ?? []);
  let viewport: HTMLElement;
  let autoScroll = $state(true);

  function onScroll() {
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    autoScroll = scrollHeight - scrollTop - clientHeight < 80;
  }

  $effect(() => {
    void chatList.length;
    tick().then(() => {
      if (autoScroll && viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  });

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

</script>

<div class="chat-view" bind:this={viewport} onscroll={onScroll} role="log">
  {#each chatList as entry (entry.ts + entry.kind + ("from" in entry ? entry.from : "sys"))}
    {#if entry.kind === "chat"}
      {@const isMe = entry.from === $selfName}
      {@const isAgentError = !isMe && /^\s*_\(.*\)_\s*$/.test(entry.content)}
      {#if isAgentError}
        <div class="error-notice">
          <span class="error-notice-name" style:color={nameColor(entry.from)}>{entry.from}</span>
          <span class="error-notice-text">{entry.content.replace(/^\s*_\(/, "").replace(/\)_\s*$/, "")}</span>
        </div>
      {:else}
        <div class="msg-wrap" class:msg-wrap-me={isMe}>
          {#if !isMe}
            <div class="sender-name" style:color={nameColor(entry.from)}>{entry.from}</div>
          {/if}
          <div class="bubble" class:bubble-me={isMe} class:bubble-agent={!isMe}>
            <MarkdownMessage content={entry.content} />
          </div>
          <div class="msg-time">{formatTime(entry.ts)}</div>
        </div>
      {/if}
    {:else if entry.kind === "system"}
      <div class="system-msg">— {entry.text} —</div>
    {:else if entry.kind === "control_ack"}
      <div class="ack-msg" class:ack-ok={entry.ok} class:ack-err={!entry.ok}>
        <span class="ack-op">/{entry.op}</span>
        {#if entry.info}<span class="ack-info">{entry.info}</span>{/if}
        {#if !entry.ok}<span class="ack-err-label">error</span>{/if}
      </div>
    {/if}
  {/each}

  {#if chatList.length === 0}
    <div class="empty">
      <p>No messages yet.</p>
      <p>Add an agent and say <code>@agent-name hello</code></p>
    </div>
  {/if}
</div>

<style>
  .chat-view {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .msg-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-width: 78%;
    align-self: flex-start;
  }
  .msg-wrap-me {
    align-self: flex-end;
    align-items: flex-end;
  }

  .sender-name {
    font-size: 11px;
    font-weight: 600;
    padding-left: 2px;
    letter-spacing: 0.01em;
  }

  .bubble {
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.6;
  }
  .bubble-agent {
    background: var(--agent-bubble-bg);
    border: 1px solid var(--agent-bubble-border);
    border-radius: 12px 12px 12px 3px;
  }
  .bubble-me {
    background: var(--agent-bubble-bg);
    border: 1px solid var(--agent-bubble-border);
    border-radius: 12px 12px 3px 12px;
  }

  .msg-time {
    font-size: 10px;
    color: var(--text-muted);
    padding: 0 2px;
  }

  .error-notice {
    align-self: flex-start;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 8px;
    border-left: 2px solid var(--danger);
    background: var(--danger-bg);
    font-size: 12px;
    max-width: 88%;
  }
  .error-notice-name { font-weight: 600; font-size: 11px; flex-shrink: 0; }
  .error-notice-text { color: var(--danger); font-family: ui-monospace, monospace; }

  .system-msg {
    align-self: center;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.03em;
  }

  .ack-msg {
    align-self: flex-start;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    border-left: 2px solid var(--ack-ok);
    background: var(--ack-bg);
    border-top: 1px solid var(--ack-border);
    border-right: 1px solid var(--ack-border);
    border-bottom: 1px solid var(--ack-border);
    font-size: 12px;
    font-family: ui-monospace, monospace;
    max-width: 88%;
  }
  .ack-err { border-left-color: var(--danger); background: var(--danger-bg); }
  .ack-op { color: var(--ack-op); font-weight: 700; flex-shrink: 0; }
  .ack-info { color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; flex: 1; }
  .ack-err-label {
    background: var(--danger-bg); color: var(--danger);
    padding: 1px 6px; border-radius: 3px; font-size: 10px;
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }
  .empty code {
    background: var(--bg-active);
    border: 1px solid var(--border-mid);
    border-radius: 4px;
    padding: 1px 6px;
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
