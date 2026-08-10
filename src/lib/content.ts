import type { TipTapDoc } from '../types'

/** An empty TipTap document (a single empty paragraph). */
export function emptyDoc(): TipTapDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Extract a plain-text projection from a TipTap JSON document. Used for
 * timeline previews and as a foundation for future local full-text search.
 * Walks the node tree collecting text nodes, inserting newlines at blocks.
 */
export function docToPlainText(doc: TipTapDoc | undefined | null): string {
  if (!doc) return ''
  const out: string[] = []
  const blockTypes = new Set([
    'paragraph',
    'heading',
    'blockquote',
    'listItem',
    'codeBlock',
  ])

  const walk = (node: any) => {
    if (!node) return
    if (node.type === 'text' && typeof node.text === 'string') {
      out.push(node.text)
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child)
    }
    if (blockTypes.has(node.type)) out.push('\n')
  }

  walk(doc)
  return out.join('').replace(/\n{2,}/g, '\n').trim()
}

/** First non-empty line, trimmed to `max` chars, for card previews. */
export function previewText(plain: string, max = 140): string {
  const firstMeaningful = plain
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  const text = firstMeaningful ?? ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
