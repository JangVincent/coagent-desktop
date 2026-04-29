<script lang="ts">
  import { renderMarkdown } from "../lib/markdown.ts";

  let { content }: { content: string } = $props();

  let html = $derived(renderMarkdown(content));
</script>

<div class="markdown-body" role="region">
  {@html html}
</div>
