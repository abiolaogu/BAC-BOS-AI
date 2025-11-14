'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';

import EditorTheme from './EditorTheme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import AutoSavePlugin from './plugins/AutoSavePlugin';
import type { DocumentContent } from '@/types/document';

interface RichTextEditorProps {
  documentId: string;
  initialContent?: DocumentContent;
  editable?: boolean;
  onContentChange?: (content: DocumentContent) => void;
}

export default function RichTextEditor({
  documentId,
  initialContent,
  editable = true,
  onContentChange,
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'NexusWriter',
    theme: EditorTheme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    editable,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
    ],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <ToolbarPlugin />

        <div className="relative flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-full p-8 outline-none prose prose-lg max-w-none"
                aria-placeholder="Start writing..."
                placeholder={
                  <div className="absolute top-8 left-8 text-gray-400 pointer-events-none">
                    Start writing...
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {editable && <AutoSavePlugin documentId={documentId} />}
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </LexicalComposer>
  );
}
