import { useEditor, type Editor, type Content } from '@tiptap/react'
import { buildExtensions } from './extensions'
import type { TipTapDoc } from '../types'

interface UseJournalEditorOptions {
  initialContent: TipTapDoc
  placeholder?: string
  /** Fired on every change with structured TipTap JSON (not rendered HTML). */
  onChange: (doc: TipTapDoc) => void
}

/**
 * Creates the TipTap editor for a single entry. The page owns the returned
 * instance so it can render the content area and the docked toolbar (and a
 * photo button) together in one bottom bar. Remount with a React `key` on the
 * entry id to load a different entry.
 */
export function useJournalEditor({
  initialContent,
  placeholder,
  onChange,
}: UseJournalEditorOptions): Editor | null {
  return useEditor({
    extensions: buildExtensions(placeholder ?? 'Write what’s on your mind…'),
    content: initialContent as Content,
    editorProps: {
      attributes: { class: 'ProseMirror', spellcheck: 'true' },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as unknown as TipTapDoc),
  })
}

export { EditorContent } from '@tiptap/react'
export { Toolbar } from './Toolbar'
