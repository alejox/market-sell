/**
 * Pure text transforms behind the notes editor toolbar. Each takes the
 * textarea's value and selection and returns the new value plus the
 * selection to restore, so the component only has to apply the result.
 */
export type NotesFormat = "bold" | "italic" | "code" | "heading" | "bullet" | "checklist";

export interface TextEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const INLINE_MARKERS: Record<"bold" | "italic" | "code", { marker: string; placeholder: string }> = {
  bold: { marker: "**", placeholder: "negrita" },
  italic: { marker: "*", placeholder: "cursiva" },
  code: { marker: "`", placeholder: "código" },
};

const LINE_PREFIXES: Record<"heading" | "bullet" | "checklist", string> = {
  heading: "## ",
  bullet: "- ",
  checklist: "- [ ] ",
};

function wrapSelection(value: string, start: number, end: number, marker: string, placeholder: string): TextEdit {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  // Selection already wrapped in the marker: unwrap it.
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    return { value: before + inner + after, selectionStart: start, selectionEnd: start + inner.length };
  }

  const text = selected.length > 0 ? selected : placeholder;
  const next = before + marker + text + marker + after;
  return { value: next, selectionStart: start + marker.length, selectionEnd: start + marker.length + text.length };
}

function prefixLines(value: string, start: number, end: number, prefix: string): TextEdit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const edited = lines.map((line) => (allPrefixed ? line.slice(prefix.length) : line.startsWith(prefix) ? line : prefix + line));
  const block = edited.join("\n");

  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + block.length,
  };
}

export function applyNotesFormat(value: string, selectionStart: number, selectionEnd: number, format: NotesFormat): TextEdit {
  const start = Math.max(0, Math.min(selectionStart, selectionEnd));
  const end = Math.min(value.length, Math.max(selectionStart, selectionEnd));

  if (format === "bold" || format === "italic" || format === "code") {
    const { marker, placeholder } = INLINE_MARKERS[format];
    return wrapSelection(value, start, end, marker, placeholder);
  }
  return prefixLines(value, start, end, LINE_PREFIXES[format]);
}
