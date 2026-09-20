import type { ReactNode } from 'react';

/** Lightweight Markdown → React for Valerie chat bubbles (no extra dependency). */
export function renderChatMarkdown(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const ListTag = listBuffer.type === 'ol' ? 'ol' : 'ul';
    const listClass =
      listBuffer.type === 'ol'
        ? 'list-decimal pl-5 my-2 space-y-1'
        : 'list-disc pl-5 my-2 space-y-1';
    blocks.push(
      <ListTag key={`list-${key++}`} className={listClass}>
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const ul = line.match(/^[-*]\s+(.+)$/);
    const ol = line.match(/^\d+[.)]\s+(.+)$/);
    const heading = line.match(/^#{1,3}\s+(.+)$/);

    if (ul) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(ul[1]);
      continue;
    }
    if (ol) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(ol[1]);
      continue;
    }

    flushList();

    if (!line.trim()) {
      blocks.push(<div key={`sp-${key++}`} className="h-2" />);
      continue;
    }

    if (heading) {
      blocks.push(
        <p key={`h-${key++}`} className="font-black text-base mt-1 mb-1">
          {renderInline(heading[1])}
        </p>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${key++}`} className="my-1">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`b-${i++}`} className="font-black">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <code
          key={`c-${i++}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[0.9em] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
