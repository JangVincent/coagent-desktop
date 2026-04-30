import { marked, type Tokens } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";

const COLLAPSE_LINES = 30;

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: Tokens.Code) {
  const validLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language: validLang }).value;
  const lines = text.split("\n");
  const shouldCollapse = lines.length > COLLAPSE_LINES;
  const langLabel = lang || "code";

  if (shouldCollapse) {
    const id = `code-${Math.random().toString(36).slice(2)}`;
    return `<details class="code-block collapsed">
  <summary><span class="lang-label">${langLabel}</span> <span class="line-count">${lines.length} lines</span></summary>
  <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
</details>`;
  }

  return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
};

marked.use({ renderer, gfm: true, breaks: true });

const ALLOWED_SCHEMES = /^(https?|mailto):/i;

/**
 * Highlight @mentions in text.
 * Runs BEFORE markdown parsing to avoid breaking inside code blocks.
 * If selfName is provided, mentions matching @selfName get a special class.
 */
function highlightMentions(text: string, selfName?: string): string {
  const selfLower = selfName?.toLowerCase();
  // Match @word but not inside backticks (inline code or fenced blocks)
  return text.replace(
    /(?<!`)`(?:[^`]|``)*`(?!`)|(@[a-zA-Z_][\w-]*)/g,
    (match, mention) => {
      if (mention) {
        const name = mention.slice(1).toLowerCase(); // remove @ and lowercase
        const isSelf = selfLower && name === selfLower;
        const cls = isSelf ? "mention mention--self" : "mention";
        return `<span class="${cls}">${mention}</span>`;
      }
      return match; // preserve code spans
    }
  );
}

export function renderMarkdown(content: string, selfName?: string): string {
  const withMentions = highlightMentions(content, selfName);
  const raw = marked.parse(withMentions) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "code", "pre", "blockquote",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "a", "details", "summary", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "class", "id", "open"],
    ALLOW_DATA_ATTR: false,
    FORBID_CONTENTS: ["script", "style"],
    HOOK: undefined,
  });
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    if (!ALLOWED_SCHEMES.test(href)) {
      node.removeAttribute("href");
    }
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});
