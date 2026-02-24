import "server-only";
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML for safe rendering via dangerouslySetInnerHTML.
 * Strips scripts, event handlers, and other XSS vectors while
 * preserving safe formatting tags.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "u", "em", "strong", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td", "img", "hr", "span",
      "div", "sub", "sup", "dl", "dt", "dd",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "target", "rel",
      "width", "height", "style", "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
