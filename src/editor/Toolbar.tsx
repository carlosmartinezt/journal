import { type Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'

/**
 * Compact, horizontally-scrollable formatting bar designed for phones.
 * It docks above the keyboard rather than sprawling like a desktop ribbon.
 */
export function Toolbar({ editor }: { editor: Editor }) {
  // Subscribe only to the toolbar-relevant bits of editor state so buttons
  // reflect the current selection without re-rendering the whole editor.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-2 py-1.5">
      <Btn active={state.h1} label="H1" onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <span className="text-[13px] font-bold">H1</span>
      </Btn>
      <Btn active={state.h2} label="H2" onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <span className="text-[13px] font-bold">H2</span>
      </Btn>
      <Btn active={state.h3} label="H3" onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <span className="text-[13px] font-bold">H3</span>
      </Btn>
      <Divider />
      <Btn active={state.bold} label="Bold" onClick={() => chain().toggleBold().run()}>
        <span className="text-[15px] font-bold">B</span>
      </Btn>
      <Btn active={state.italic} label="Italic" onClick={() => chain().toggleItalic().run()}>
        <span className="text-[15px] font-serif italic">I</span>
      </Btn>
      <Divider />
      <Btn active={state.bullet} label="Bulleted list" onClick={() => chain().toggleBulletList().run()}>
        <BulletIcon />
      </Btn>
      <Btn active={state.ordered} label="Numbered list" onClick={() => chain().toggleOrderedList().run()}>
        <OrderedIcon />
      </Btn>
      <Btn active={state.quote} label="Quote" onClick={() => chain().toggleBlockquote().run()}>
        <QuoteIcon />
      </Btn>
      <Divider />
      <Btn label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <UndoIcon />
      </Btn>
      <Btn label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <RedoIcon />
      </Btn>
    </div>
  )
}

function Btn({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Prevent the editor from losing selection when tapping a button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        'flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 transition-colors',
        active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-line',
        disabled ? 'opacity-30' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-line" />
}

/* --- inline icons (stroke = currentColor) --- */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
function BulletIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </svg>
  )
}
function OrderedIcon() {
  return (
    <svg {...iconProps}>
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1</text>
      <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2</text>
      <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3</text>
    </svg>
  )
}
function QuoteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 7H4v4h3v6M17 7h-3v4h3v6" transform="scale(1,-1) translate(0,-24)" />
    </svg>
  )
}
function UndoIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </svg>
  )
}
function RedoIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h1" />
    </svg>
  )
}
