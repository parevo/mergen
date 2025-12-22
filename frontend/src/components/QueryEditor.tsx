import React, { useEffect, useRef } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, Code2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Configure Monaco loader
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs' } });

interface Props {
    value: string;
    onChange: (value: string) => void;
    onExecute: () => void;
    loading: boolean;
}

export function QueryEditor({ value, onChange, onExecute, loading }: Props) {
    const monacoRef = useRef<Monaco | null>(null);

    const handleEditorWillMount = (monaco: Monaco) => {
        monacoRef.current = monaco;

        // Custom theme for Monaco to match OpenDB shadcn theme better
        monaco.editor.defineTheme('opendb-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#020205', // bg-background approx
                'editor.lineHighlightBackground': '#1e293b20',
                'editorCursor.foreground': '#3b82f6',
                'editor.selectionBackground': '#3b82f630',
                'editorActiveLineNumber.foreground': '#3b82f6',
            }
        });

        // Register SQL completion
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const keywords = [
                    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'LEFT', 'RIGHT',
                    'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'DESC', 'ASC', 'IN',
                    'NULL', 'NOT', 'AND', 'OR', 'UNION', 'AS', 'CREATE', 'ALTER', 'DROP', 'TABLE',
                    'DATABASE', 'SHOW', 'USE', 'DESCRIBE', 'EXPLAIN'
                ];

                const suggestions = keywords.map(keyword => ({
                    label: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: keyword,
                    range: range
                }));

                return { suggestions };
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="h-10 border-b flex items-center justify-between px-3 shrink-0 bg-muted/20">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-5 px-1.5 font-mono text-[9px] bg-background border-primary/30 text-primary uppercase tracking-tighter">
                        SQL MODE
                    </Badge>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        <Code2 size={12} className="text-muted-foreground/60" />
                        Console
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onChange('')}
                        title="Clear Console"
                    >
                        <Trash2 size={14} />
                    </Button>
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                        size="sm"
                        className="h-7 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
                        onClick={onExecute}
                        disabled={loading || !value.trim()}
                    >
                        {loading ? (
                            <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <>
                                <Play className="mr-1.5 h-3.5 w-3.5" />
                                EXECUTE
                            </>
                        )}
                        <kbd className="ml-2 pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-primary-foreground/10 px-1 font-mono text-[9px] font-medium opacity-100">
                            ⌘↵
                        </kbd>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden pt-2">
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    theme="opendb-theme"
                    value={value}
                    onChange={(val) => onChange(val || '')}
                    beforeMount={handleEditorWillMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                        automaticLayout: true,
                        padding: { top: 10 },
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                    }}
                />
            </div>
        </div>
    );
}

