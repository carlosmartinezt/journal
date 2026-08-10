import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Extensions } from '@tiptap/react'

/**
 * Shared TipTap extension set. StarterKit provides paragraphs, headings,
 * bold/italic, bullet + ordered lists, blockquote, and history (undo/redo).
 * We constrain headings to H1–H3 to match the product spec.
 */
export function buildExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Keep the toolbar surface small; these aren't in the spec.
      codeBlock: false,
      horizontalRule: false,
    }),
    Placeholder.configure({ placeholder }),
  ]
}
