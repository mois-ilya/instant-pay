import { Component, createSignal, createEffect } from 'solid-js';
import { createCodeMirror } from 'solid-codemirror';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeBlockProps {
  code: string;
  title?: string;
}

export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const { ref, editorView, createExtension } = createCodeMirror({
    value: props.code,
  });

  // Extensions - pass directly without function wrapper
  createExtension(javascript({ typescript: true, jsx: true }));
  createExtension(oneDark);
  createExtension(EditorView.editable.of(false));
  createExtension(EditorView.lineWrapping);
  createExtension(EditorView.theme({
    '&': {
      fontSize: '13px',
      backgroundColor: '#282c34',
    },
    '.cm-scroller': {
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      overflow: 'auto',
    },
    '.cm-gutters': {
      backgroundColor: '#21252b',
      borderRight: '1px solid #333',
    },
    '.cm-content': {
      padding: '12px 0',
    },
    '.cm-line': {
      padding: '0 12px',
    },
  }));

  // Update editor content when props.code changes
  createEffect(() => {
    const view = editorView();
    if (view && props.code !== view.state.doc.toString()) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: props.code,
        },
      });
    }
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="rounded-lg overflow-hidden border border-separator-common">
      {props.title && (
        <div class="bg-[#21252b] px-4 py-2.5 text-xs font-medium text-white/70 border-b border-[#333] flex items-center justify-between">
          <span class="text-[#abb2bf]">{props.title}</span>
          <button
            onClick={handleCopy}
            class="text-white/50 hover:text-white/90 transition-colors flex items-center gap-1.5 text-xs"
            title="Copy code"
          >
            {copied() ? (
              <>
                <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div ref={ref} />
    </div>
  );
};
