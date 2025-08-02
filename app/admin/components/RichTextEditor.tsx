"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heart,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 font-body',
      },
    },
  })

  if (!editor) {
    return (
      <div className="border border-accent/30 rounded-lg p-4 bg-white/50 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-8 w-8 text-primary/40 mx-auto mb-2 animate-heart-beat" />
          <p className="text-muted-foreground font-body">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-accent/30 rounded-lg bg-white/50 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-accent/20 p-2 flex flex-wrap gap-1 bg-white/80">
        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Font Family"
            >
              <Type className="h-4 w-4 mr-1" />
              Font
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border shadow-lg">
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Inter, ui-sans-serif, system-ui, sans-serif').run()}>
              Default
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Georgia, serif').run()}>
              Georgia
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Times New Roman, serif').run()}>
              Times New Roman
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Arial, sans-serif').run()}>
              Arial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Courier New, monospace').run()}>
              Courier New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Dancing Script, cursive').run()}>
              Dancing Script
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Amiri, serif').run()}>
              Amiri (Arabic)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Noto Sans Hebrew, sans-serif').run()}>
              Noto Sans Hebrew
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-accent/30 mx-1" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : ''}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : ''}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border shadow-lg">
            <div className="grid grid-cols-6 gap-1 p-2">
              {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
                '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  title={color}
                />
              ))}
            </div>
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
              Remove Color
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-accent/30 mx-1" />

        {/* Text Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary' : ''}`}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : ''}`}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary' : ''}`}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-accent/30 mx-1" />

        {/* Lists and Quote */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : ''}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-primary/20 text-primary' : ''}`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-accent/30 mx-1" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-accent/30 mx-1" />

        {/* RTL/LTR Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentDir = editor.getAttributes('paragraph').dir || 'ltr'
            const newDir = currentDir === 'ltr' ? 'rtl' : 'ltr'
            editor.chain().focus().updateAttributes('paragraph', { dir: newDir }).run()
          }}
          className="h-8 px-2"
          title="Toggle Text Direction (RTL/LTR)"
        >
          RTL
        </Button>
      </div>

      {/* Editor Content */}
      <div className="min-h-[150px] max-h-[300px] overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="prose-editor"
        />
        {!value && (
          <div className="absolute inset-4 pointer-events-none text-muted-foreground/60 font-body">
            {placeholder || 'Start writing your beautiful memory...'}
          </div>
        )}
      </div>
    </div>
  )
}