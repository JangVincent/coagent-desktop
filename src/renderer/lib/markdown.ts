import { marked, type Tokens } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { nameColor } from "./name-color.ts";

const COLLAPSE_LINES = 30;

const renderer = new marked.Renderer();

function looksLikeDiff(text: string): boolean {
  if (/^diff --git /m.test(text)) return true;
  if (/^@@ .* @@/m.test(text)) return true;
  const lines = text.split("\n");
  if (lines.length < 2) return false;
  let diffLines = 0;
  for (const line of lines) {
    if (/^[+\-](?![+\-])/.test(line)) diffLines++;
  }
  return diffLines >= 2 && diffLines / lines.length >= 0.25;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === '"' ? "&quot;" : "&#39;"
  ));
}

// Render a diff block with each line as its own block-level span.
// Avoids hljs diff output, which interleaves \n text nodes between
// block spans and creates doubled line spacing inside <pre>.
function renderDiffBlock(text: string): string {
  return text.split("\n").map((line) => {
    let cls = "diff-line";
    if (
      line.startsWith("+++") || line.startsWith("---") ||
      line.startsWith("@@") || line.startsWith("diff ") ||
      line.startsWith("index ") || line.startsWith("Index:")
    ) cls += " hljs-meta";
    else if (line.startsWith("+")) cls += " hljs-addition";
    else if (line.startsWith("-")) cls += " hljs-deletion";
    const content = line === "" ? "​" : escapeHtml(line);
    return `<span class="${cls}">${content}</span>`;
  }).join("");
}

renderer.code = function ({ text, lang }: Tokens.Code) {
  const inferred = !lang && looksLikeDiff(text) ? "diff" : lang;
  const isDiff = inferred === "diff";
  const validLang = isDiff
    ? "diff"
    : (inferred && hljs.getLanguage(inferred) ? inferred : "plaintext");
  const highlighted = isDiff
    ? renderDiffBlock(text)
    : hljs.highlight(text, { language: validLang }).value;
  const lines = text.split("\n");
  const shouldCollapse = lines.length > COLLAPSE_LINES;
  const langLabel = lang || (isDiff ? "diff" : "code");

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
 * Self-mentions use accent color, others use their nameColor.
 */
function highlightMentions(text: string, selfName?: string): string {
  const selfLower = selfName?.toLowerCase();
  // Match @word but not inside backticks (inline code or fenced blocks)
  return text.replace(
    /(?<!`)`(?:[^`]|``)*`(?!`)|(@[a-zA-Z_][\w-]*)/g,
    (match, mention) => {
      if (mention) {
        const name = mention.slice(1); // remove @
        const isSelf = selfLower && name.toLowerCase() === selfLower;
        if (isSelf) {
          // Self-mention: use accent color (handled by CSS class)
          return `<span class="mention mention--self">${mention}</span>`;
        }
        // Other mentions: use participant's nameColor with inline style
        const color = nameColor(name);
        return `<span class="mention" style="--mention-color: ${color}">${mention}</span>`;
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
    ALLOWED_ATTR: ["href", "class", "id", "open", "style"],
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
