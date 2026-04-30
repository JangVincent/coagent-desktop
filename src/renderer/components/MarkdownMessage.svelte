<script lang="ts">
  import { renderMarkdown } from "../lib/markdown.ts";
  import { selfName } from "../lib/stores/self.ts";

  let { content }: { content: string } = $props();

  let html = $derived(renderMarkdown(content, $selfName));
</script>

<div class="markdown-body" role="region">
  {@html html}
</div>
