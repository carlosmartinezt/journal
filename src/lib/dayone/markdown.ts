import { marked } from 'marked'
import type { TipTapDoc } from '../../types'

/**
 * Markdown <-> TipTap JSON conversion for Day One interop. We support the same
 * node set as the editor (paragraphs, H1–H3, bold, italic, bullet/ordered
 * lists, blockquote, hard breaks). Inline images are ignored here — photos are
 * handled separately by the importer/exporter. Anything we don't model
 * degrades gracefully to paragraphs/plain text rather than being dropped.
 */

type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string; marks?: { type: string }[] }

// ---------------------------------------------------------------------------
// Markdown -> TipTap
// ---------------------------------------------------------------------------

export function markdownToTipTap(md: string): TipTapDoc {
  const tokens = marked.lexer(md ?? '')
  const content = blockTokensToNodes(tokens as unknown[])
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

function blockTokensToNodes(tokens: unknown[]): Node[] {
  const nodes: Node[] = []
  for (const t of tokens as any[]) {
    switch (t.type) {
      case 'heading': {
        const level = Math.min(3, Math.max(1, t.depth ?? 1))
        nodes.push({ type: 'heading', attrs: { level }, content: inline(t.tokens) })
        break
      }
      case 'paragraph': {
        const content = inline(t.tokens)
        // A paragraph that was only an image becomes empty — skip it.
        if (content.length) nodes.push({ type: 'paragraph', content })
        break
      }
      case 'blockquote':
        nodes.push({ type: 'blockquote', content: blockTokensToNodes(t.tokens ?? []) })
        break
      case 'list': {
        const listType = t.ordered ? 'orderedList' : 'bulletList'
        const items: Node[] = (t.items ?? []).map((li: any) => ({
          type: 'listItem',
          content: listItemContent(li),
        }))
        if (items.length) nodes.push({ type: listType, content: items })
        break
      }
      case 'code':
        // codeBlock is disabled in the editor → keep the text as a paragraph.
        if (t.text) nodes.push({ type: 'paragraph', content: [{ type: 'text', text: t.text }] })
        break
      case 'space':
      case 'hr':
        break
      case 'html':
      case 'text': {
        const text = (t.text ?? '').trim()
        if (text) nodes.push({ type: 'paragraph', content: [{ type: 'text', text }] })
        break
      }
      default: {
        const text = (t.raw ?? t.text ?? '').trim()
        if (text) nodes.push({ type: 'paragraph', content: [{ type: 'text', text }] })
      }
    }
  }
  return nodes
}

function listItemContent(li: any): Node[] {
  // marked list items hold block tokens; tight lists use a 'text' token whose
  // .tokens are inline. Normalise both into paragraph(s).
  const out: Node[] = []
  for (const tok of li.tokens ?? []) {
    if (tok.type === 'text') {
      const content = inline(tok.tokens ?? [{ type: 'text', text: tok.text }])
      out.push({ type: 'paragraph', content: content.length ? content : [] })
    } else {
      out.push(...blockTokensToNodes([tok]))
    }
  }
  if (!out.length) out.push({ type: 'paragraph' })
  return out
}

function inline(tokens: unknown[] | undefined, marks: string[] = []): Node[] {
  const out: Node[] = []
  for (const t of (tokens ?? []) as any[]) {
    switch (t.type) {
      case 'text':
      case 'escape':
      case 'codespan':
      case 'html':
        pushText(out, t.text ?? '', marks)
        break
      case 'strong':
        out.push(...inline(t.tokens, addMark(marks, 'bold')))
        break
      case 'em':
        out.push(...inline(t.tokens, addMark(marks, 'italic')))
        break
      case 'del':
        out.push(...inline(t.tokens, marks))
        break
      case 'link':
        // Keep the visible text; drop the URL (no link node in our schema).
        out.push(...inline(t.tokens, marks))
        break
      case 'br':
        out.push({ type: 'hardBreak' })
        break
      case 'image':
        // Handled by the importer as an attached photo — ignore inline.
        break
      default:
        pushText(out, t.text ?? '', marks)
    }
  }
  return out
}

function pushText(out: Node[], text: string, marks: string[]) {
  if (!text) return
  const node: Node = { type: 'text', text }
  if (marks.length) node.marks = marks.map((m) => ({ type: m }))
  out.push(node)
}

function addMark(marks: string[], mark: string): string[] {
  return marks.includes(mark) ? marks : [...marks, mark]
}

// ---------------------------------------------------------------------------
// TipTap -> Markdown
// ---------------------------------------------------------------------------

export function tipTapToMarkdown(doc: TipTapDoc | undefined | null): string {
  if (!doc?.content) return ''
  return blocksToMarkdown(doc.content as Node[]).trim()
}

function blocksToMarkdown(nodes: Node[], depth = 0): string {
  const parts: string[] = []
  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const level = (node.attrs?.level as number) ?? 1
        parts.push(`${'#'.repeat(level)} ${inlineToMarkdown(node.content)}`)
        break
      }
      case 'paragraph':
        parts.push(inlineToMarkdown(node.content))
        break
      case 'blockquote':
        parts.push(
          blocksToMarkdown(node.content ?? [], depth)
            .split('\n')
            .map((l) => (l ? `> ${l}` : '>'))
            .join('\n'),
        )
        break
      case 'bulletList':
      case 'orderedList': {
        const ordered = node.type === 'orderedList'
        const items = (node.content ?? []).map((li, i) => {
          const marker = ordered ? `${i + 1}.` : '-'
          const inner = blocksToMarkdown(li.content ?? [], depth + 1)
          const indented = inner
            .split('\n')
            .map((l, idx) => (idx === 0 ? `${marker} ${l}` : `  ${l}`))
            .join('\n')
          return indented
        })
        parts.push(items.join('\n'))
        break
      }
      default:
        if (node.text) parts.push(node.text)
    }
  }
  return parts.join('\n\n')
}

function inlineToMarkdown(nodes: Node[] | undefined): string {
  let out = ''
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      out += '  \n'
      continue
    }
    let text = node.text ?? ''
    const marks = new Set((node.marks ?? []).map((m) => m.type))
    if (marks.has('bold')) text = `**${text}**`
    if (marks.has('italic')) text = `*${text}*`
    out += text
  }
  return out
}
