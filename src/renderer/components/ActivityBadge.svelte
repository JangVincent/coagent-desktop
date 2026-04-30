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
    gap: 5px;
    font-family: var(--font-mono);
    font-size: var(--fs-cap);
    color: var(--text-3);
    letter-spacing: var(--tr-cap);
    text-transform: uppercase;
    animation: settle 220ms var(--ease);
  }
  .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.4s var(--ease) infinite;
    flex-shrink: 0;
    box-shadow: 0 0 6px var(--accent-line);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.7); }
  }
  @keyframes settle {
    from { opacity: 0; transform: scale(0.85); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
