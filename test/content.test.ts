import { describe, expect, it } from 'vitest'
import { docToPlainText, previewText, emptyDoc } from '../src/lib/content'
import type { TipTapDoc } from '../src/types'

describe('docToPlainText', () => {
  it('extracts text across blocks with newlines', () => {
    const doc: TipTapDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
          ],
        },
      ],
    }
    const text = docToPlainText(doc)
    expect(text).toContain('Title')
    expect(text).toContain('Hello world')
    expect(text).toContain('one')
  })

  it('handles empty documents', () => {
    expect(docToPlainText(emptyDoc())).toBe('')
    expect(docToPlainText(null)).toBe('')
  })
})

describe('previewText', () => {
  it('takes the first non-empty line and truncates', () => {
    expect(previewText('\n\nFirst line\nSecond')).toBe('First line')
    expect(previewText('x'.repeat(200)).endsWith('…')).toBe(true)
  })
})
