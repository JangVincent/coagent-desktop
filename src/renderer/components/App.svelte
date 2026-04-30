<script lang="ts">
  import { onMount } from "svelte";
  import { initWsClient } from "../lib/ws-client.ts";
  import { selfName } from "../lib/stores/self.ts";
  import { activeRoomId } from "../lib/stores/rooms.ts";
  import { updateAgentStatus } from "../lib/stores/agents.ts";
  import { appendLog } from "../lib/stores/agent-logs.ts";
  import RoomSidebar from "./RoomSidebar.svelte";
  import RoomTabs from "./RoomTabs.svelte";
  import ChatView from "./ChatView.svelte";
  import Composer from "./Composer.svelte";
  import SlashCommandBar from "./SlashCommandBar.svelte";
  import DropZone from "./DropZone.svelte";

  let ready = $state(false);
  let initError = $state<string | null>(null);

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

      window.coagent.onAgentLog(({ name: agentName, stream, line }) => {
        appendLog(agentName, stream, line);
      });
      ready = true;
    } catch (e) {
      initError = String(e);
      console.error("coagent-app init failed:", e);
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
      <RoomTabs />

      <DropZone>
        <ChatView roomId={$activeRoomId} />
        <SlashCommandBar roomId={$activeRoomId} />
        <Composer roomId={$activeRoomId} />
      </DropZone>
    </main>
  </div>
{:else}
  <div class="loading">
    <div class="spinner"></div>
    <span class="loading-label">connecting</span>
  </div>
{/if}

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-0);
    min-width: 0;
  }

  .loading {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    background: var(--bg-0);
  }
  .spinner {
    width: 18px; height: 18px;
    border: 1.5px solid var(--line-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.9s var(--ease) infinite;
  }
  .loading-label {
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    text-transform: uppercase;
    letter-spacing: var(--tr-cap);
    color: var(--text-3);
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-screen {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-0);
  }
  .error-box {
    background: var(--bg-2);
    border: 1px solid var(--danger-line);
    border-radius: var(--r-lg);
    padding: 24px 26px;
    max-width: 560px;
    width: 90%;
    box-shadow: var(--shadow-modal);
  }
  .error-box strong {
    color: var(--danger);
    display: block;
    margin-bottom: 10px;
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    text-transform: uppercase;
    letter-spacing: var(--tr-cap);
    font-weight: 600;
  }
  .error-box pre {
    font-size: var(--fs-xs);
    color: var(--text-2);
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    font-family: var(--font-mono);
    line-height: 1.6;
  }
</style>
