import React, { useState, useEffect, useCallback } from 'react';
import { ColumnInfo, TableDataResponse } from '../types';
import { GetTableData, InsertRow, UpdateRow, DeleteRow, SelectExportPath, ExportTable } from '../../wailsjs/go/main/App';
import {
    Plus,
    Trash2,
    RefreshCcw,
    X,
    ChevronLeft,
    ChevronRight,
    Table as TableIcon,
    Search,
    MoreVertical,
    Filter,
    Settings2,
    Eraser,
    AlertTriangle,
    Hash,
    Copy,
    FileJson,
    FileText,
    Database,
    Download,
    ArrowUp,
    ArrowDown,
    ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useDatabase } from '../hooks/useDatabase';
import { ModifyTableModal } from './ModifyTableModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
    database: string;
    table: string;
    onClose: () => void;
}

export function DataEditor({ database, table, onClose }: Props) {
    const { truncateTable, dropTable, alterTable } = useDatabase();
    const [data, setData] = useState<TableDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [showAddRow, setShowAddRow] = useState(false);
    const [newRowData, setNewRowData] = useState<Record<string, string>>({});

    // UI State
    const [confirmAction, setConfirmAction] = useState<{ type: 'truncate' | 'drop' } | null>(null);
    const [showModifyModal, setShowModifyModal] = useState(false);

    // Sorting State
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

    // Filtering State
    const [activeFilter, setActiveFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [globalSearch, setGlobalSearch] = useState('');

    // Parse filter value to SQL condition
    const getSqlCondition = (colName: string, value: string): string | null => {
        if (!value) return null;

        value = value.trim();
        if (value.startsWith('>=')) return `\`${colName}\` >= '${value.substring(2).trim()}'`;
        if (value.startsWith('<=')) return `\`${colName}\` <= '${value.substring(2).trim()}'`;
        if (value.startsWith('>')) return `\`${colName}\` > '${value.substring(1).trim()}'`;
        if (value.startsWith('<')) return `\`${colName}\` < '${value.substring(1).trim()}'`;
        if (value.startsWith('!=') || value.startsWith('<>')) return `\`${colName}\` != '${value.substring(2).trim()}'`;
        if (value.startsWith('=')) return `\`${colName}\` = '${value.substring(1).trim()}'`;

        if (value.toLowerCase() === 'null') return `\`${colName}\` IS NULL`;
        if (value.toLowerCase() === '!null') return `\`${colName}\` IS NOT NULL`;

        // Default to LIKE for strings, = for numbers if simple value
        // But for simplicity/flexibility, LIKE is safer for text search, = for numbers
        // Let's guess: if it looks like a number, use =
        if (/^-?\d+(\.\d+)?$/.test(value)) return `\`${colName}\` = ${value}`;

        // Otherwise partial match
        return `\`${colName}\` LIKE '%${value.replace(/'/g, "''")}%'`;
    };

    const applyFilters = (colFilters: Record<string, string> = columnFilters, globalVal: string = globalSearch) => {
        const conditions = Object.entries(colFilters)
            .map(([col, val]) => getSqlCondition(col, val))
            .filter(Boolean);

        const colSql = conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';

        // Global Search Logic
        let globalSql = '';
        if (globalVal && data?.columns) {
            const orConditions = data.columns.map(col => {
                // Heuristic: only search text/numeric, ignore blob etc if needed. 
                // For now, simple LIKE on mostly everything.
                return `\`${col.name}\` LIKE '%${globalVal.replace(/'/g, "''")}%'`;
            });
            globalSql = `(${orConditions.join(' OR ')})`;
        }

        const parts = [globalSql, colSql].filter(Boolean);
        const finalSql = parts.length > 0 ? parts.join(' AND ') : '';

        setActiveFilter(finalSql);
    };

    const handleGlobalSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyFilters(columnFilters, globalSearch);
            setPage(1);
        }
    };

    const handleColumnFilterChange = (colName: string, value: string) => {
        const newFilters = { ...columnFilters, [colName]: value };
        if (!value) delete newFilters[colName];
        setColumnFilters(newFilters);
        // Debounce could be good here, but for now let's apply on Enter or blur in the input
    };

    const handleFilterKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyFilters(columnFilters, globalSearch);
            setPage(1);
        }
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortColumn(column);
            setSortDirection('ASC');
        }
        // Page reset is not strictly necessary but often good practice on sort change
        // But if we want to keep context, maybe keep page. DataGrip keeps global pos? 
        // Let's keep page for now, but usually sorting resets view.
    };

    const clearAllFilters = () => {
        setColumnFilters({});
        setGlobalSearch('');
        setActiveFilter('');
        setPage(1);
    };

    // Context Menu Actions
    const filterByValue = (colName: string, value: any) => {
        const valStr = value === null ? 'NULL' : String(value);
        const op = value === null ? 'NULL' : `= ${valStr}`;
        const cleanVal = value === null ? 'NULL' : valStr; // For input display

        const newFilters = { ...columnFilters, [colName]: value === null ? 'NULL' : `=${valStr}` };
        setColumnFilters(newFilters);
        applyFilters(newFilters, globalSearch);
        setPage(1);
        toast.success(`Filtered by ${colName} = ${cleanVal}`);
    };

    const filterExcludeValue = (colName: string, value: any) => {
        const valStr = value === null ? 'NULL' : String(value);
        const newFilters = { ...columnFilters, [colName]: value === null ? '!NULL' : `!=${valStr}` };
        setColumnFilters(newFilters);
        applyFilters(newFilters, globalSearch);
        setPage(1);
        toast.success(`Excluded ${colName} = ${valStr}`);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await GetTableData({
                database,
                table,
                page,
                pageSize,
                orderBy: sortColumn,
                orderDir: sortDirection,
                filters: activeFilter // This is mainly constructed in applyFilters now
            });
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
            toast.error(`Error loading ${table}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [database, table, page, pageSize, activeFilter, sortColumn, sortDirection]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ... (UseEffects and other handlers same as before) 
    // Re-inserting other handlers to keep context valid if needed or just assuming they are there.
    // Wait, replacing from line 97 (state decls) is better? No, I need to keep existing generic states.
    // I will replace `loadData` and keep others mostly.
    // Actually, I should just insert the filter logic and update the UI separately to avoid massive replace blocks erroring.

    // Let's target the UI render part first for the Filter Row.

    // ... [Previous handlers] ...

    // Filter Row UI Renderer
    // Insert this into the TableHeader

    // ... [Previous Render return] ...

    // IMPORTANT: I need to replace the entire component logic? No, too risky.
    // I will use multiple smaller edits.

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCellDoubleClick = (rowIndex: number, colIndex: number, value: any) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setEditValue(value === null ? '' : String(value));
    };

    const handleCellSave = async () => {
        if (!editingCell || !data) return;

        const column = data.columns[editingCell.col];
        const row = data.rows[editingCell.row];
        const pkIndex = data.columns.findIndex(c => c.name === data.primaryKey);
        const pkValue = row[pkIndex];

        try {
            await UpdateRow(database, table, data.primaryKey, pkValue, {
                [column.name]: editValue === '' ? null : editValue
            });
            toast.success("Row updated successfully");
            await loadData();
            setEditingCell(null);
        } catch (err: any) {
            toast.error(`Update failed: ${err.message}`);
            setError(err.message || 'Update failed');
        }
    };

    const handleCellKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCellSave();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const handleDeleteSelected = async () => {
        if (!data || selectedRows.size === 0) return;

        const count = selectedRows.size;
        const pkIndex = data.columns.findIndex(c => c.name === data.primaryKey);

        try {
            const pkValues = Array.from(selectedRows).map(idx => data.rows[idx][pkIndex]);
            for (const pkValue of pkValues) {
                await DeleteRow(database, table, data.primaryKey, pkValue);
            }
            setSelectedRows(new Set());
            toast.success(`${count} row(s) deleted`);
            await loadData();
        } catch (err: any) {
            toast.error(`Deletion failed: ${err.message}`);
        }
    };

    const handleAddRow = async (keepOpen = false) => {
        if (!data) return;

        const rowData: Record<string, any> = {};
        for (const col of data.columns) {
            if (newRowData[col.name] !== undefined && newRowData[col.name] !== '') {
                rowData[col.name] = newRowData[col.name];
            }
        }

        try {
            await InsertRow(database, table, rowData);
            setNewRowData({});
            if (!keepOpen) {
                setShowAddRow(false);
            }
            toast.success("New row inserted successfully");
            await loadData();
        } catch (err: any) {
            toast.error(`Insert failed: ${err.message}`);
        }
    };

    const toggleRowSelection = (index: number) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };



    const handleTruncate = async () => {
        const success = await truncateTable(database, table);
        if (success) {
            loadData();
            setConfirmAction(null);
        }
    };

    const handleDrop = async () => {
        const success = await dropTable(database, table);
        if (success) {
            setConfirmAction(null);
            onClose();
        }
    };

    const formatValue = (value: any): string => {
        if (value === null) return 'NULL';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    // Copy helpers
    const copyAsCSV = () => {
        const columns = data?.columns.map(c => c.name) || [];
        const rows = getSelectedRowsData();
        const header = columns.join(',');
        const csvData = rows.map(row =>
            row.map(cell => {
                if (cell === null) return '';
                const str = String(cell);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        ).join('\n');
        navigator.clipboard.writeText(`${header}\n${csvData}`);
        toast.success('Copied as CSV');
    };

    const copyAsJSON = () => {
        const columns = data?.columns.map(c => c.name) || [];
        const rows = getSelectedRowsData();
        const jsonData = rows.map(row => {
            const obj: Record<string, any> = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
        navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
        toast.success('Copied as JSON');
    };

    const handleExport = async (format: 'xlsx' | 'csv' | 'json') => {
        try {
            const path = await SelectExportPath(format);
            if (!path) return; // Cancelled

            toast.promise(ExportTable(database, table, format, path), {
                loading: 'Exporting data...',
                success: 'Data exported successfully',
                error: (err) => `Export failed: ${err}`
            });
        } catch (err: any) {
            toast.error(`Export failed: ${err.message}`);
        }
    };

    const copyAsSQLInsert = () => {
        const columns = data?.columns.map(c => c.name) || [];
        const rows = getSelectedRowsData();
        const inserts = rows.map(row => {
            const values = row.map(cell => {
                if (cell === null) return 'NULL';
                if (typeof cell === 'number') return String(cell);
                return `'${String(cell).replace(/'/g, "''")}'`;
            }).join(', ');
            return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});`;
        }).join('\n');
        navigator.clipboard.writeText(inserts);
        toast.success('Copied as SQL INSERT');
    };

    const getSelectedRowsData = (): any[][] => {
        if (!data) return [];
        if (selectedRows.size === 0) return data.rows;
        return Array.from(selectedRows).sort((a, b) => a - b).map(i => data.rows[i]);
    };

    if (loading && !data) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse font-medium uppercase tracking-widest text-[10px]">Loading Data...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
            {/* Editor Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-muted/20 shrink-0 shadow-sm z-10 gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/20 shadow-inner">
                        <TableIcon size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-tight flex items-center gap-2 uppercase">
                            {table}
                            {activeFilter && <Badge variant="secondary" className="h-4 text-[8px] bg-primary/20 text-primary animate-pulse">FILTERED</Badge>}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <span className="opacity-60">{database}</span>
                            <Separator orientation="vertical" className="h-2" />
                            <span className="text-primary/70">{data.totalRows} ROWS</span>
                        </div>
                    </div>
                </div>

                {/* Global Search Bar - Centered/Flexible */}
                <div className="flex-1 max-w-md relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors group-hover:text-primary/70" size={14} />
                    <Input
                        placeholder="Search everywhere..."
                        className="h-8 pl-8 bg-background/50 border-muted-foreground/20 focus-visible:bg-background transition-all text-xs w-full"
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        onKeyDown={handleGlobalSearchKeyDown}
                    />
                    {globalSearch && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50 border border-border px-1 rounded animate-in fade-in pointer-events-none">
                            ENTER
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active Filters Display & Clear */}
                    {activeFilter && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                            <Badge variant="secondary" className="h-7 px-3 text-[10px] bg-primary/10 text-primary border border-primary/20 flex items-center gap-2">
                                <Filter size={10} />
                                <span className="hidden sm:inline">FILTERS ACTIVE</span>
                                <Separator orientation="vertical" className="h-3 bg-primary/20" />
                                <span
                                    className="hover:bg-destructive/10 hover:text-destructive p-0.5 rounded cursor-pointer transition-colors"
                                    onClick={clearAllFilters}
                                    title="Clear All Filters"
                                >
                                    <X size={12} />
                                </span>
                            </Badge>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[10px] font-bold gap-1.5 uppercase hover:bg-primary/5 border-primary/20"
                        onClick={() => setShowAddRow(true)}
                    >
                        <Plus size={14} className="text-primary" />
                        <span className="hidden sm:inline">ROW</span>
                    </Button>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical size={14} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="text-[11px] font-medium" onClick={() => loadData()}>
                                <RefreshCcw size={12} className="mr-2" /> Refresh Data
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] font-medium" onClick={() => setShowModifyModal(true)}>
                                <Settings2 size={12} className="mr-2" /> Modify Table
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-[11px] font-medium" onClick={() => handleExport('xlsx')}>
                                <FileText size={12} className="mr-2 text-green-600" /> Export to Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] font-medium" onClick={() => handleExport('csv')}>
                                <Download size={12} className="mr-2" /> Export to CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] font-medium" onClick={() => handleExport('json')}>
                                <FileJson size={12} className="mr-2" /> Export to JSON
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-[11px] font-medium text-destructive focus:text-destructive"
                                onClick={() => setConfirmAction({ type: 'truncate' })}
                            >
                                <Eraser size={12} className="mr-2" /> Truncate Table
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-[11px] font-medium text-destructive focus:text-destructive"
                                onClick={() => setConfirmAction({ type: 'drop' })}
                            >
                                <Trash2 size={12} className="mr-2" /> Drop Table
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive ml-1" onClick={onClose}>
                        <X size={16} />
                    </Button>
                </div>
            </div>

            {/* Add Row Section */}
            {
                showAddRow && (
                    <Card className="m-4 border-primary/20 bg-primary/5 shadow-xl animate-in slide-in-from-top-4 duration-300">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">New Entry</h4>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddRow(false)}>
                                    <X size={14} />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {data.columns.map(col => (
                                    <div key={col.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground truncate">{col.name}</Label>
                                            <div className="flex gap-1">
                                                {col.key === 'PRI' && <Badge className="text-[8px] h-3 px-1 bg-amber-500 hover:bg-amber-500">PK</Badge>}
                                                <span className="text-[8px] opacity-40 uppercase">{col.type}</span>
                                            </div>
                                        </div>
                                        {col.type.includes('bool') || col.type.includes('tinyint(1)') ? (
                                            <Select
                                                value={newRowData[col.name]}
                                                onValueChange={(val) => setNewRowData({ ...newRowData, [col.name]: val })}
                                            >
                                                <SelectTrigger className="h-7 text-xs bg-background">
                                                    <SelectValue placeholder={col.nullable ? "NULL" : "Select..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {col.nullable && <SelectItem value="">NULL</SelectItem>}
                                                    <SelectItem value="1">TRUE</SelectItem>
                                                    <SelectItem value="0">FALSE</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                className="h-7 text-xs bg-background"
                                                value={newRowData[col.name] || ''}
                                                onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                                                placeholder={col.nullable ? 'NULL' : col.name}
                                                type={col.type.includes('int') || col.type.includes('decimal') || col.type.includes('float') ? 'number' : 'text'}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setShowAddRow(false)}>CANCEL</Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-4 text-[11px] font-bold uppercase border-primary/20 text-primary hover:bg-primary/5"
                                    onClick={() => handleAddRow(true)}
                                >
                                    Commit & Add Another
                                </Button>
                                <Button size="sm" className="h-8 px-6 text-[11px] font-bold uppercase" onClick={() => handleAddRow(false)}>Commit Row</Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Main Grid */}
            <div className="flex-1 overflow-hidden relative">
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <ScrollArea className="h-full w-full">
                            <Table className="border-collapse min-w-full">
                                <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm border-b-2 border-border/60">
                                    <TableRow className="border-b shadow-none hover:bg-transparent">
                                        <TableHead className="w-10 text-center border-r bg-muted/20 p-0 h-auto align-top pt-2">
                                            <input
                                                type="checkbox"
                                                className="w-3 h-3 rounded accent-primary cursor-pointer mx-auto"
                                                checked={data.rows.length > 0 && selectedRows.size === data.rows.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedRows(new Set(data.rows.map((_, i) => i)));
                                                    else setSelectedRows(new Set());
                                                }}
                                            />
                                        </TableHead>
                                        {data.columns.map((col, i) => (
                                            <TableHead
                                                key={i}
                                                className={cn(
                                                    "border-r last:border-r-0 text-muted-foreground p-0 h-auto align-top transition-colors hover:bg-muted/50",
                                                    sortColumn === col.name && "bg-primary/5 text-primary font-bold"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    {/* Header Title Area */}
                                                    <div
                                                        className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none group/header"
                                                        onClick={() => handleSort(col.name)}
                                                    >
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <span className="text-[11px] font-bold uppercase tracking-tight truncate" title={col.name}>
                                                                {col.name}
                                                            </span>
                                                            {col.key === 'PRI' && <div className="w-1 h-1 rounded-full bg-amber-500" title="Primary Key" />}
                                                        </div>

                                                        <div className="flex items-center text-muted-foreground/30 group-hover/header:text-muted-foreground/80 transition-colors">
                                                            {sortColumn === col.name ? (
                                                                sortDirection === 'ASC' ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />
                                                            ) : (
                                                                <ArrowUpDown size={10} className="opacity-0 group-hover/header:opacity-100" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-border/40" />

                                                    {/* Compact Filter Input */}
                                                    <div className="relative bg-background/50">
                                                        <Input
                                                            className={cn(
                                                                "h-7 border-0 rounded-none text-[10px] px-2 py-0 bg-transparent focus-visible:ring-0 focus-visible:bg-background transition-all font-mono placeholder:text-muted-foreground/40",
                                                                columnFilters[col.name] && "text-primary font-medium bg-primary/5"
                                                            )}
                                                            placeholder="..."
                                                            value={columnFilters[col.name] || ''}
                                                            onChange={(e) => handleColumnFilterChange(col.name, e.target.value)}
                                                            onKeyDown={handleFilterKeyDown}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        {columnFilters[col.name] && (
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <Filter size={8} className="text-primary opacity-50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.rows.map((row, rowIndex) => (
                                        <TableRow
                                            key={rowIndex}
                                            className={cn(
                                                "group transition-colors border-b last:border-b-0",
                                                selectedRows.has(rowIndex) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/30"
                                            )}
                                        >
                                            <TableCell className="text-center border-r py-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-3 h-3 rounded accent-primary cursor-pointer"
                                                    checked={selectedRows.has(rowIndex)}
                                                    onChange={() => toggleRowSelection(rowIndex)}
                                                />
                                            </TableCell>
                                            {row.map((cell, colIndex) => (
                                                <TableCell
                                                    key={colIndex}
                                                    className={cn(
                                                        "text-[12px] py-1.5 border-r last:border-r-0 font-medium font-mono min-w-[120px] px-4",
                                                        cell === null ? "text-muted-foreground/30 italic font-normal" : "text-foreground/80",
                                                        editingCell?.row === rowIndex && editingCell?.col === colIndex && "p-0"
                                                    )}
                                                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex, cell)}
                                                >
                                                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                                        <input
                                                            type="text"
                                                            className="w-full h-full bg-background border-2 border-primary outline-none px-4 py-1.5 animate-in zoom-in-95 duration-100 shadow-[0_0_10px_rgba(59,130,246,0.3)] z-50"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={handleCellKeyDown}
                                                            onBlur={handleCellSave}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="truncate block max-w-[300px]" title={formatValue(cell)}>
                                                            {formatValue(cell)}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                        <ContextMenuItem onClick={copyAsCSV}>
                            <FileText className="mr-2 h-4 w-4" />
                            Copy as CSV
                        </ContextMenuItem>
                        <ContextMenuItem onClick={copyAsJSON}>
                            <FileJson className="mr-2 h-4 w-4" />
                            Copy as JSON
                        </ContextMenuItem>
                        <ContextMenuItem onClick={copyAsSQLInsert}>
                            <Database className="mr-2 h-4 w-4" />
                            Copy as SQL INSERT
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {editingCell === null && selectedRows.size <= 1 && (
                            <>
                                <ContextMenuItem onClick={() => {
                                    // Hacky way to find clicked cell? 
                                    // Ideally, ContextMenu should know the target. 
                                    // In this structure, we might need to store "last right-clicked cell" or pass it.
                                    // For now, let's assume the user Right-Clicked -> Selects this.
                                    // Actually, Radix ContextMenu Trigger doesn't pass params easily to Content.
                                    // Use a state "contextMenuTarget: {col: string, val: any}" set onContextMenu on the cell.
                                }}>
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filter by Value
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                            </>
                        )}
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

                {/* Floating Bulk Action bar */}
                {selectedRows.size > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-primary/40 shadow-2xl rounded-full px-6 py-2.5 flex items-center gap-6 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 z-50 ring-4 ring-primary/10 backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="text-[11px] font-bold tracking-wider uppercase text-foreground/90">{selectedRows.size} Rows Selected</span>
                        </div>
                        <Separator orientation="vertical" className="h-4 bg-primary/20" />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteSelected}
                                className="h-8 px-4 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10 hover:text-destructive tracking-widest gap-2"
                            >
                                <Trash2 size={14} />
                                Batch Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRows(new Set())}
                                className="h-8 px-4 text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted/30 tracking-widest"
                            >
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="h-10 border-t bg-muted/20 flex items-center justify-between px-4 shrink-0 shadow-inner">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                    <span className="flex items-center gap-1.5 opacity-60">
                        <Hash size={12} strokeWidth={3} />
                        PAGE {page} / {data.totalPages}
                    </span>
                    <Separator orientation="vertical" className="h-3 bg-muted-foreground/20" />
                    <span className="opacity-60">{pageSize} SCAN UNIT</span>
                </div>

                <div className="flex gap-1.5 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted/50 transition-all border border-transparent hover:border-border/50"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft size={16} />
                    </Button>

                    <div className="flex gap-1">
                        {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                            const p = i + 1;
                            return (
                                <Button
                                    key={p}
                                    variant={page === p ? "secondary" : "ghost"}
                                    className={cn(
                                        "h-7 min-w-7 px-2 text-[10px] font-black transition-all",
                                        page === p ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/40 scale-105" : "hover:bg-muted/50 opacity-60 hover:opacity-100"
                                    )}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted/50 transition-all border border-transparent hover:border-border/50"
                        disabled={page >= data.totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                <AlertDialogContent className="bg-card border-destructive/20 shadow-2xl">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20 animate-pulse">
                            <AlertTriangle size={24} />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold tracking-tight uppercase">
                            {confirmAction?.type === 'truncate' ? 'Deep Clean Table?' : 'Delete Table Entirely?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                            {confirmAction?.type === 'truncate'
                                ? `You are about to remove ALL records from "${table}". This operation cannot be undone. Auto-increment values will be reset.`
                                : `You are about to PERMANENTLY DELETE the table "${table}" and all its data. This action is irreversible.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex gap-2">
                        <AlertDialogCancel className="font-bold border-none hover:bg-muted/50 uppercase tracking-widest text-[11px] h-10">Cancel Action</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction?.type === 'truncate' ? handleTruncate : handleDrop}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black uppercase tracking-widest text-[11px] h-10 px-6 shadow-lg shadow-destructive/20"
                        >
                            Confirmed
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modify Table Modal */}
            {
                showModifyModal && data && (
                    <ModifyTableModal
                        database={database}
                        table={table}
                        columns={data.columns}
                        loading={loading}
                        onClose={() => setShowModifyModal(false)}
                        onSave={async (alt) => {
                            const success = await alterTable(database, table, alt);
                            if (success) {
                                loadData();
                            }
                            return success;
                        }}
                    />
                )
            }
        </div >
    );
}
