'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot } from 'lexical';
import { useDocumentStore } from '@/store';
import { useUpdateDocument } from '@/hooks';

interface AutoSavePluginProps {
  documentId: string;
  delay?: number;
}

export default function AutoSavePlugin({ documentId, delay = 2000 }: AutoSavePluginProps) {
  const [editor] = useLexicalComposerContext();
  const setSaving = useDocumentStore((state) => state.setSaving);
  const { mutate: updateDocument } = useUpdateDocument(documentId);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastSavedContent: string | null = null;

    const saveContent = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const content = {
          root: root.exportJSON(),
        };

        const contentString = JSON.stringify(content);

        // Only save if content has changed
        if (contentString !== lastSavedContent) {
          lastSavedContent = contentString;
          setSaving(true);

          // Calculate word count and char count
          const plainText = root.getTextContent();
          const wordCount = plainText.split(/\s+/).filter(Boolean).length;
          const charCount = plainText.length;

          updateDocument(
            {
              content: content as any,
              plainText,
              wordCount,
              charCount,
            },
            {
              onSettled: () => {
                setSaving(false);
              },
            }
          );
        }
      });
    };

    const unregisterListener = editor.registerUpdateListener(() => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout for auto-save
      timeoutId = setTimeout(saveContent, delay);
    });

    return () => {
      unregisterListener();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [editor, documentId, delay, updateDocument, setSaving]);

  return null;
}
