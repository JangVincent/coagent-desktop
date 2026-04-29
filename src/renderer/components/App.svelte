<script lang="ts">
  import { onMount } from "svelte";
  import { initWsClient } from "../lib/ws-client.ts";
  import { selfName } from "../lib/stores/self.ts";
  import { rooms, activeRoomId } from "../lib/stores/rooms.ts";
  import { agents, updateAgentStatus } from "../lib/stores/agents.ts";
  import RoomSidebar from "./RoomSidebar.svelte";
  import ChatView from "./ChatView.svelte";
  import Composer from "./Composer.svelte";
  import SlashCommandBar from "./SlashCommandBar.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";

  let ready = $state(false);
  let initError = $state<string | null>(null);

  let activeRoom = $derived($rooms.find((r) => r.id === $activeRoomId));
  let roomAgentCount = $derived(
    $agents.filter((a) => a.room === $activeRoomId && a.status !== "exited").length
  );

  onMount(async () => {
    try {
      const [{ port }, { name }] = await Promise.all([
        window.coagent.getHubPort(),
        window.coagent.getSelfName(),
      ]);
      selfName.set(name);
      initWsClient(port, name);
      window.coagent.onAgentStatus(({ name: agentName, status }) => {
        updateAgentStatus(agentName, status);
      });
      ready = true;
    } catch (e) {
      initError = String(e);
      console.error("coagent-desktop init failed:", e);
    }
  });
</script>

{#if initError}
  <div class="error-screen">
    <div class="error-box">
      <strong>Initialization failed</strong>
      <pre>{initError}</pre>
    </div>
  </div>
{:else if ready}
  <div class="layout">
    <RoomSidebar />

    <main class="main-area">
      <header class="chat-header">
        <div class="header-left">
          <span class="room-hash">#</span>
          <span class="room-name">{activeRoom?.label ?? $activeRoomId}</span>
          {#if roomAgentCount > 0}
            <span class="room-meta">{roomAgentCount} agent{roomAgentCount > 1 ? "s" : ""}</span>
          {/if}
        </div>
        <div class="header-right">
          <ThemeToggle />
        </div>
      </header>

      <ChatView roomId={$activeRoomId} />
      <SlashCommandBar roomId={$activeRoomId} />
      <Composer roomId={$activeRoomId} />
    </main>
  </div>
{:else}
  <div class="loading">
    <div class="spinner"></div>
  </div>
{/if}

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-panel);
    -webkit-app-region: drag;
    height: 44px;
    flex-shrink: 0;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    -webkit-app-region: no-drag;
  }
  .header-right {
    -webkit-app-region: no-drag;
  }
  .room-hash {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-muted);
    line-height: 1;
  }
  .room-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .room-meta {
    font-size: 11px;
    color: var(--text-muted);
    padding: 1px 7px;
    border-radius: 10px;
    border: 1px solid var(--border-mid);
  }

  .loading {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spinner {
    width: 28px; height: 28px;
    border: 2px solid var(--border-mid);
    border-top-color: var(--text-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-screen {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-base);
  }
  .error-box {
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    padding: 24px 28px;
    max-width: 560px;
    width: 90%;
  }
  .error-box strong { color: var(--danger); display: block; margin-bottom: 10px; font-size: 13px; font-weight: 600; }
  .error-box pre { font-size: 11px; color: var(--text-secondary); white-space: pre-wrap; word-break: break-all; margin: 0; font-family: monospace; }
</style>
