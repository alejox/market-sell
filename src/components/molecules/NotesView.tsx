import type { ReactNode } from "react";
import { parseNotes, type Block, type Inline } from "@/components/notes-markdown";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "code":
        return (
          <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
            {node.value}
          </code>
        );
      case "link":
        return (
          <a key={index} href={node.href} target="_blank" rel="noopener noreferrer" className="text-info underline-offset-4 hover:underline">
            {renderInline(node.children)}
          </a>
        );
    }
  });
}

function renderLines(lines: Inline[][]): ReactNode {
  return lines.map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {renderInline(line)}
    </span>
  ));
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case "heading":
      if (block.level === 1) return <h2 key={index} className="text-2xl text-on-surface">{renderInline(block.inline)}</h2>;
      if (block.level === 2) return <h3 key={index} className="font-serif text-xl text-on-surface">{renderInline(block.inline)}</h3>;
      return <h4 key={index} className="text-base font-semibold text-on-surface">{renderInline(block.inline)}</h4>;
    case "paragraph":
      return <p key={index}>{renderLines(block.lines)}</p>;
    case "quote":
      return (
        <blockquote key={index} className="border-l-2 border-border pl-4 text-muted-on">
          {renderLines(block.lines)}
        </blockquote>
      );
    case "code":
      return (
        <pre key={index} className="overflow-x-auto rounded-2xl bg-muted p-4 font-mono text-sm">
          <code>{block.value}</code>
        </pre>
      );
    case "rule":
      return <hr key={index} className="border-border" />;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      const marker = block.ordered ? "list-decimal" : block.items.some((item) => item.checked !== null) ? "list-none" : "list-disc";
      return (
        <Tag key={index} className={`flex flex-col gap-1 pl-5 ${marker}`}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className={item.checked === true ? "text-muted-on line-through" : undefined}>
              {item.checked !== null && (
                <span aria-hidden="true" className="mr-2 inline-block w-4 -ml-5 text-center no-underline">
                  {item.checked ? "☑" : "☐"}
                </span>
              )}
              {item.checked !== null && <span className="sr-only">{item.checked ? "Hecho: " : "Pendiente: "}</span>}
              {renderInline(item.inline)}
            </li>
          ))}
        </Tag>
      );
    }
  }
}

/** Read-only rendering of a task's notes. Pure React elements — no raw HTML is ever injected. */
export function NotesView({ source, emptyMessage = "Sin notas todavía." }: { source: string; emptyMessage?: string }) {
  const blocks = parseNotes(source);
  if (blocks.length === 0) {
    return <p className="text-sm text-muted-on">{emptyMessage}</p>;
  }
  return <div className="flex flex-col gap-3 text-sm leading-relaxed text-on-surface">{blocks.map(renderBlock)}</div>;
}
