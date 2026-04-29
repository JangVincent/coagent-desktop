<script lang="ts">
  import { activities } from "../lib/stores/activities.ts";
  import type { ActivityKind } from "@shared/protocol.ts";

  let { agentName }: { agentName: string } = $props();

  let activity = $derived($activities.get(agentName));
  let kind: ActivityKind = $derived(activity?.kind ?? "idle");
  let toolName = $derived(activity?.tool);

  let label = $derived(
    kind === "tool" && toolName
      ? toolName.replace(/^mcp__[^_]+__/, "")
      : kind === "thinking" ? "thinking"
      : kind === "compact" ? "compact"
      : kind === "usage" ? "usage"
      : ""
  );
</script>

{#if kind !== "idle"}
  <span class="badge">
    <span class="dot"></span>
    {label}
  </span>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }
  .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: blink 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
