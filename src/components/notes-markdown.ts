/**
 * Tiny, dependency-free Markdown subset for the task notebook. It produces a
 * plain data tree (never HTML strings) that `NotesView` renders as React
 * elements, so user-written notes can never inject markup or scripts.
 *
 * Blocks: `#`/`##`/`###` headings, bullet / numbered / `- [ ]` checklist
 * lists, `>` quotes, fenced code, `---` rules, paragraphs.
 * Inline: `**bold**`, `*italic*`, `` `code` ``, and `[text](https://…)` links
 * (http/https only — any other scheme stays plain text).
 */
export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] };

export interface ListItem {
  /** `null` for a plain item, `true`/`false` for a checked/unchecked checklist item. */
  checked: boolean | null;
  inline: Inline[];
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inline: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "quote"; lines: Inline[][] }
  | { type: "code"; value: string }
  | { type: "rule" };

const INLINE_TOKEN =
  /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*([^*\s](?:[^*]*[^*\s])?)\*/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = INLINE_TOKEN.exec(rest);
    if (!match) {
      out.push({ type: "text", value: rest });
      break;
    }
    if (match.index > 0) {
      out.push({ type: "text", value: rest.slice(0, match.index) });
    }
    if (match[1] !== undefined) {
      out.push({ type: "strong", children: parseInline(match[1]) });
    } else if (match[2] !== undefined) {
      out.push({ type: "code", value: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      out.push({ type: "link", href: match[4], children: parseInline(match[3]) });
    } else if (match[5] !== undefined) {
      out.push({ type: "em", children: parseInline(match[5]) });
    }
    rest = rest.slice(match.index + match[0].length);
  }

  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const CHECKLIST = /^[-*]\s+\[( |x|X)\]\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const FENCE = /^```/;

export function parseNotes(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      i += 1;
      continue;
    }

    if (FENCE.test(trimmed)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or end of input for an unterminated block)
      blocks.push({ type: "code", value: body.join("\n") });
      continue;
    }

    if (RULE.test(trimmed)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    const heading = HEADING.exec(trimmed);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, inline: parseInline(heading[2]) });
      i += 1;
      continue;
    }

    if (CHECKLIST.test(trimmed) || BULLET.test(trimmed) || ORDERED.test(trimmed)) {
      const ordered = ORDERED.test(trimmed);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const check = CHECKLIST.exec(current);
        if (check) {
          if (ordered) break;
          items.push({ checked: check[1] !== " ", inline: parseInline(check[2]) });
        } else if (!ordered && BULLET.exec(current)) {
          items.push({ checked: null, inline: parseInline(BULLET.exec(current)![1]) });
        } else if (ordered && ORDERED.exec(current)) {
          items.push({ checked: null, inline: parseInline(ORDERED.exec(current)![1]) });
        } else {
          break;
        }
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (QUOTE.test(trimmed)) {
      const quoted: Inline[][] = [];
      while (i < lines.length && QUOTE.test(lines[i].trim())) {
        quoted.push(parseInline(QUOTE.exec(lines[i].trim())![1]));
        i += 1;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }

    const paragraph: Inline[][] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (
        current.length === 0 ||
        FENCE.test(current) ||
        RULE.test(current) ||
        HEADING.test(current) ||
        CHECKLIST.test(current) ||
        BULLET.test(current) ||
        ORDERED.test(current) ||
        QUOTE.test(current)
      ) {
        break;
      }
      paragraph.push(parseInline(current));
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }

  return blocks;
}
