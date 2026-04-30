<script lang="ts">
  import { theme } from "../lib/stores/theme.ts";
</script>

<button
  class="toggle"
  onclick={() => theme.toggle()}
  title={$theme === "dark" ? "Switch to light" : "Switch to dark"}
  aria-label="Toggle theme"
>
  {#if $theme === "dark"}
    <!-- Sun icon -->
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="7.5" cy="7.5" r="3"/>
      <line x1="7.5" y1="1" x2="7.5" y2="2.5"/>
      <line x1="7.5" y1="12.5" x2="7.5" y2="14"/>
      <line x1="1" y1="7.5" x2="2.5" y2="7.5"/>
      <line x1="12.5" y1="7.5" x2="14" y2="7.5"/>
      <line x1="3.05" y1="3.05" x2="4.11" y2="4.11"/>
      <line x1="10.89" y1="10.89" x2="11.95" y2="11.95"/>
      <line x1="11.95" y1="3.05" x2="10.89" y2="4.11"/>
      <line x1="4.11" y1="10.89" x2="3.05" y2="11.95"/>
    </svg>
  {:else}
    <!-- Moon icon -->
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 0a7 7 0 1 0 7 7A7 7 0 0 0 7 0zm0 12.5A5.5 5.5 0 0 1 4.24 2.7a5.5 5.5 0 0 0 5.56 8.37A5.47 5.47 0 0 1 7 12.5z"/>
    </svg>
  {/if}
</button>

<style>
  .toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--r-sm);
    color: var(--text-3);
    transition: color var(--t-fast) var(--ease),
                background var(--t-fast) var(--ease),
                transform var(--t-slow) var(--ease);
    flex-shrink: 0;
  }
  .toggle:hover {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .toggle:active { transform: rotate(180deg); }
</style>
