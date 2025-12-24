import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QueryResult } from '../types';
import {
    AlertCircle,
    Terminal,
    FileJson,
    Hash,
    Table as TableIcon,
    ChevronRight,
    Copy,
    FileText,
    Database,
    X
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
    results?: QueryResult[];
    result?: QueryResult | null; // Deprecated
    error: string | null;
}

// Helper to detect JSON
const isJSON = (val: any): boolean => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
    try {
        JSON.parse(val);
        return true;
    } catch {
        return false;
    }
};

// Helper to format JSON
const formatJSON = (val: string): string => {
    try {
        return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
        return val;
    }
};

// Copy helpers
const copyAsCSV = (rows: any[][], columns: string[]) => {
    const header = columns.join(',');
    const data = rows.map(row =>
        row.map(cell => {
            if (cell === null) return '';
            const str = String(cell);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        }).join(',')
    ).join('\n');
    navigator.clipboard.writeText(`${header}\n${data}`);
    toast.success('Copied as CSV');
};

const copyAsJSON = (rows: any[][], columns: string[]) => {
    const data = rows.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied as JSON');
};

const copyAsSQLInsert = (rows: any[][], columns: string[], tableName: string = 'table_name') => {
    const inserts = rows.map(row => {
        const values = row.map(cell => {
            if (cell === null) return 'NULL';
            if (typeof cell === 'number') return String(cell);
            return `'${String(cell).replace(/'/g, "''")}'`;
        }).join(', ');
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
    }).join('\n');
    navigator.clipboard.writeText(inserts);
    toast.success('Copied as SQL INSERT');
};

export function ResultsTable({ results, result, error }: Props) {
    // Unify input to array
    const data = results || (result ? [result] : []);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [jsonPreview, setJsonPreview] = useState<{ value: string; open: boolean }>({ value: '', open: false });

    const parentRef = useRef<HTMLDivElement>(null);

    // Reset active index when data changes significantly
    useEffect(() => {
        if (data.length > 0 && activeIndex >= data.length) {
            setActiveIndex(0);
        }
        setSelectedRows(new Set());
    }, [data.length]);

    const activeResult = data[activeIndex];
    const rows = activeResult?.rows || [];
    const columns = activeResult?.columns || [];

    // Virtual scrolling
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36,
        overscan: 20,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    // Row selection
    const toggleRowSelection = (index: number, event: React.MouseEvent) => {
        const newSelected = new Set(selectedRows);
        if (event.shiftKey && selectedRows.size > 0) {
            // Range selection
            const lastSelected = Math.max(...Array.from(selectedRows));
            const start = Math.min(lastSelected, index);
            const end = Math.max(lastSelected, index);
            for (let i = start; i <= end; i++) {
                newSelected.add(i);
            }
        } else if (event.metaKey || event.ctrlKey) {
            // Toggle single
            if (newSelected.has(index)) {
                newSelected.delete(index);
            } else {
                newSelected.add(index);
            }
        } else {
            // Single selection
            newSelected.clear();
            newSelected.add(index);
        }
        setSelectedRows(newSelected);
    };

    const handleCellClick = (value: any) => {
        if (isJSON(value)) {
            setJsonPreview({ value: formatJSON(value), open: true });
        }
    };

    // Get selected rows data
    const getSelectedRowsData = (): any[][] => {
        if (selectedRows.size === 0) return rows;
        return Array.from(selectedRows).sort((a, b) => a - b).map(i => rows[i]);
    };

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-6 pb-20">
                <div className="max-w-2xl w-full bg-destructive/5 border border-destructive/20 rounded-xl p-6 shadow-2xl shadow-destructive/10 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-destructive/10 rounded-lg text-destructive shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                                Execution Failed
                                <Badge variant="destructive" className="h-4 text-[9px] px-1 font-bold">SQL Error</Badge>
                            </h3>
                            <pre className="text-[12px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed bg-black/20 p-4 rounded-lg border border-destructive/10">
                                {error}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-40">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
                    <Terminal size={32} />
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Execution Console</p>
                    <p className="text-[11px] mt-1 font-medium">Results will appear here after execution</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="h-9 border-b flex items-center justify-between px-4 bg-muted/10 shrink-0">
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-muted-foreground tracking-widest overflow-hidden">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <TableIcon size={12} className="text-primary/60" />
                        Query Results
                    </div>

                    {data.length > 1 && (
                        <div className="flex items-center gap-1 ml-2">
                            <Separator orientation="vertical" className="h-3 mr-2" />
                            {data.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[9px] transition-colors border",
                                        activeIndex === idx
                                            ? "bg-primary/20 text-primary border-primary/20"
                                            : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    Result {idx + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Hash size={12} className="text-muted-foreground/40" />
                        {activeResult?.rowCount?.toLocaleString()} rows
                    </div>

                    {selectedRows.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="h-3" />
                            <div className="flex items-center gap-1.5 text-primary">
                                {selectedRows.size} selected
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {rows.length > 100 && (
                        <Badge variant="outline" className="text-[8px] font-mono font-bold border-green-500/30 text-green-500">
                            VIRTUAL
                        </Badge>
                    )}
                    <Badge variant="secondary" className="text-[9px] font-mono font-bold border-none bg-primary/10 text-primary">SCANNED</Badge>
                </div>
            </div>

            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div ref={parentRef} className="flex-1 overflow-auto relative">
                        <div style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
                            {/* Sticky header */}
                            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
                                <div className="flex">
                                    <div className="w-12 shrink-0 text-center text-[10px] font-black text-muted-foreground/30 py-3 uppercase tracking-tighter border-r">
                                        #
                                    </div>
                                    {columns.map((col, i) => (
                                        <div
                                            key={i}
                                            className="min-w-[120px] flex-1 text-[11px] font-bold text-foreground/80 py-3 px-3 uppercase tracking-wider border-r last:border-r-0"
                                        >
                                            {col}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Virtual rows */}
                            {virtualRows.map((virtualRow) => {
                                const row = rows[virtualRow.index];
                                const isSelected = selectedRows.has(virtualRow.index);
                                return (
                                    <div
                                        key={virtualRow.key}
                                        className={cn(
                                            "flex border-b cursor-pointer transition-colors",
                                            isSelected ? "bg-primary/15" : "hover:bg-primary/5"
                                        )}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start + 44}px)`, // +44 for header
                                        }}
                                        onClick={(e) => toggleRowSelection(virtualRow.index, e)}
                                    >
                                        <div className={cn(
                                            "w-12 shrink-0 text-center font-mono text-[10px] text-muted-foreground/40 border-r py-2",
                                            isSelected ? "bg-primary/20" : "bg-muted/5"
                                        )}>
                                            {virtualRow.index + 1}
                                        </div>
                                        {row.map((cell, cellIndex) => (
                                            <div
                                                key={cellIndex}
                                                className={cn(
                                                    "min-w-[120px] flex-1 text-[12px] py-2 px-3 border-r last:border-r-0 font-medium truncate",
                                                    cell === null
                                                        ? "text-muted-foreground italic opacity-50 font-normal"
                                                        : "text-foreground/90 font-mono",
                                                    isJSON(cell) && "text-blue-500 cursor-pointer hover:underline"
                                                )}
                                                onClick={(e) => {
                                                    if (isJSON(cell)) {
                                                        e.stopPropagation();
                                                        handleCellClick(cell);
                                                    }
                                                }}
                                                title={cell === null ? 'NULL' : String(cell)}
                                            >
                                                {cell === null ? 'NULL' : (
                                                    isJSON(cell) ? (
                                                        <span className="flex items-center gap-1">
                                                            <FileJson size={12} />
                                                            JSON
                                                        </span>
                                                    ) : String(cell).substring(0, 100)
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem onClick={() => copyAsCSV(getSelectedRowsData(), columns)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Copy as CSV
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => copyAsJSON(getSelectedRowsData(), columns)}>
                        <FileJson className="mr-2 h-4 w-4" />
                        Copy as JSON
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => copyAsSQLInsert(getSelectedRowsData(), columns)}>
                        <Database className="mr-2 h-4 w-4" />
                        Copy as SQL INSERT
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => {
                        const text = getSelectedRowsData().map(row => row.join('\t')).join('\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Copied to clipboard');
                    }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Raw
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {/* JSON Preview Dialog */}
            <Dialog open={jsonPreview.open} onOpenChange={(open) => setJsonPreview(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                            <FileJson className="h-4 w-4 text-blue-500" />
                            JSON Preview
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <pre className="text-[11px] font-mono p-4 bg-muted/30 rounded-lg border whitespace-pre-wrap">
                            {jsonPreview.value}
                        </pre>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(jsonPreview.value);
                                toast.success('JSON copied to clipboard');
                            }}
                        >
                            <Copy className="mr-2 h-3 w-3" />
                            Copy
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setJsonPreview({ value: '', open: false })}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
