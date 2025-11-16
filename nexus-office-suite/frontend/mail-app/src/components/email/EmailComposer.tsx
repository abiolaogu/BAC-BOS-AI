'use client';

import { useState } from 'react';
import { useComposerStore, useUIStore } from '@/store/emailStore';
import { emailAPI } from '@/lib/api/emails';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function EmailComposer() {
  const {
    isOpen,
    to,
    cc,
    bcc,
    subject,
    bodyHTML,
    attachments,
    priority,
    setTo,
    setCc,
    setBcc,
    setSubject,
    setBodyHTML,
    addAttachment,
    removeAttachment,
    setPriority,
    resetComposer,
    closeComposer,
  } = useComposerStore();

  const { showCc, showBcc, toggleCc, toggleBcc } = useUIStore();
  const [isSending, setIsSending] = useState(false);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
    ],
    content: bodyHTML,
    onUpdate: ({ editor }) => {
      setBodyHTML(editor.getHTML());
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      acceptedFiles.forEach((file) => addAttachment(file));
    },
    noClick: true,
  });

  const handleAddRecipient = (type: 'to' | 'cc' | 'bcc') => {
    const input = type === 'to' ? toInput : type === 'cc' ? ccInput : bccInput;
    const emails = input.split(/[,;\s]+/).filter((e) => e.trim());

    if (emails.length > 0) {
      if (type === 'to') {
        setTo([...to, ...emails]);
        setToInput('');
      } else if (type === 'cc') {
        setCc([...cc, ...emails]);
        setCcInput('');
      } else {
        setBcc([...bcc, ...emails]);
        setBccInput('');
      }
    }
  };

  const handleRemoveRecipient = (type: 'to' | 'cc' | 'bcc', email: string) => {
    if (type === 'to') {
      setTo(to.filter((e) => e !== email));
    } else if (type === 'cc') {
      setCc(cc.filter((e) => e !== email));
    } else {
      setBcc(bcc.filter((e) => e !== email));
    }
  };

  const handleSend = async () => {
    if (to.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      const confirmed = confirm('Send email without a subject?');
      if (!confirmed) return;
    }

    setIsSending(true);
    try {
      await emailAPI.send({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        body: editor?.getText() || '',
        body_html: bodyHTML,
        priority,
      });

      toast.success('Email sent successfully!');
      resetComposer();
      closeComposer();
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await emailAPI.saveDraft({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        body: editor?.getText() || '',
        body_html: bodyHTML,
        priority,
      });
      toast.success('Draft saved');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <button
            onClick={() => {
              if (confirm('Discard this message?')) {
                resetComposer();
                closeComposer();
              }
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Recipients */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          {/* To */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 w-16">To:</label>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {to.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                >
                  {email}
                  <button
                    onClick={() => handleRemoveRecipient('to', email)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                    e.preventDefault();
                    handleAddRecipient('to');
                  }
                }}
                onBlur={() => handleAddRecipient('to')}
                className="flex-1 min-w-[200px] text-sm border-0 focus:ring-0 p-0"
                placeholder="Add recipients"
              />
            </div>
            <div className="flex space-x-2">
              <button onClick={toggleCc} className="text-sm text-blue-600 hover:text-blue-800">
                Cc
              </button>
              <button onClick={toggleBcc} className="text-sm text-blue-600 hover:text-blue-800">
                Bcc
              </button>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 w-16">Cc:</label>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {cc.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient('cc', email)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                      e.preventDefault();
                      handleAddRecipient('cc');
                    }
                  }}
                  onBlur={() => handleAddRecipient('cc')}
                  className="flex-1 min-w-[200px] text-sm border-0 focus:ring-0 p-0"
                  placeholder="Add Cc recipients"
                />
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 w-16">Bcc:</label>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {bcc.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient('bcc', email)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                      e.preventDefault();
                      handleAddRecipient('bcc');
                    }
                  }}
                  onBlur={() => handleAddRecipient('bcc')}
                  className="flex-1 min-w-[200px] text-sm border-0 focus:ring-0 p-0"
                  placeholder="Add Bcc recipients"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 w-16">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm border-0 focus:ring-0 p-0"
              placeholder="Email subject"
            />
          </div>
        </div>

        {/* Editor toolbar */}
        {editor && (
          <div className="px-6 py-2 border-b border-gray-200 flex items-center space-x-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
              title="Underline"
            >
              <u>U</u>
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
              title="Bullet List"
            >
              •
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
              title="Numbered List"
            >
              1.
            </button>
          </div>
        )}

        {/* Editor */}
        <div {...getRootProps()} className="flex-1 overflow-y-auto px-6 py-4">
          <input {...getInputProps()} />
          <EditorContent editor={editor} className="prose max-w-none min-h-full" />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md"
                >
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Save Draft
            </button>
            <label className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer">
              <input type="file" multiple className="hidden" onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach(addAttachment);
                }
              }} />
              Attach
            </label>
          </div>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>
    </div>
  );
}
