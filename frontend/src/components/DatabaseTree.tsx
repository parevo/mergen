import React, { useState, useEffect } from 'react';
import { TableInfo, ColumnInfo, DatabaseInfo } from '../types';
import {
    ChevronRight,
    ChevronDown,
    Database as DatabaseIcon,
    Table as TableIcon,
    Columns,
    RefreshCw,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    databases: DatabaseInfo[];
    onGetTables: (db: string) => Promise<TableInfo[]>;
    onGetColumns: (db: string, table: string) => Promise<ColumnInfo[]>;
    onSelectDatabase: (db: string) => void;
    onSelectTable: (db: string, table: string) => void;
    connected: boolean;
}

interface TreeNode {
    id: string;
    name: string;
    type: 'database' | 'table' | 'column';
    expanded: boolean;
    children?: TreeNode[];
    loading?: boolean;
}

export function DatabaseTree({
    databases,
    onGetTables,
    onGetColumns,
    onSelectDatabase,
    onSelectTable,
    connected
}: Props) {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        setNodes(databases.map(db => ({
            id: db.name,
            name: db.name,
            type: 'database',
            expanded: false,
        })));
    }, [databases]);

    const toggleNode = async (node: TreeNode) => {
        if (node.type === 'column') return;

        const newNodes = [...nodes];
        const updateNode = (list: TreeNode[]): boolean => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === node.id) {
                    list[i].expanded = !list[i].expanded;
                    if (list[i].expanded && !list[i].children) {
                        fetchChildren(list[i]);
                    }
                    return true;
                }
                if (list[i].children && updateNode(list[i].children!)) return true;
            }
            return false;
        };

        updateNode(newNodes);
        setNodes(newNodes);
    };

    const fetchChildren = async (node: TreeNode) => {
        node.loading = true;
        setNodes([...nodes]);

        try {
            if (node.type === 'database') {
                const tables = await onGetTables(node.name);
                node.children = tables.map(t => ({
                    id: `${node.id}.${t.name}`,
                    name: t.name,
                    type: 'table',
                    expanded: false,
                }));
            } else if (node.type === 'table') {
                const dbName = node.id.split('.')[0];
                const columns = await onGetColumns(dbName, node.name);
                node.children = columns.map(c => ({
                    id: `${node.id}.${c.name}`,
                    name: c.name,
                    type: 'column',
                    expanded: false,
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            node.loading = false;
            setNodes([...nodes]);
        }
    };

    const renderNode = (node: TreeNode, depth: number = 0) => {
        if (filter && !node.name.toLowerCase().includes(filter.toLowerCase()) && !node.children?.some(c => c.name.toLowerCase().includes(filter.toLowerCase()))) {
            if (node.type === 'database' && !node.expanded) return null;
        }

        const hasChildren = node.type !== 'column';
        const indent = depth * 12;

        return (
            <div key={node.id}>
                <div
                    className={cn(
                        "group flex items-center py-1.5 px-3 cursor-pointer select-none hover:bg-accent/50 transition-colors rounded-sm mx-1",
                        depth === 0 ? "mt-0.5" : ""
                    )}
                    style={{ paddingLeft: `${indent + 12}px` }}
                    onClick={() => {
                        if (node.type === 'database') onSelectDatabase(node.name);
                        if (node.type === 'table') onSelectTable(node.id.split('.')[0], node.name);
                        if (hasChildren) toggleNode(node);
                    }}
                >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {hasChildren && (
                            <div className="w-4 h-4 flex items-center justify-center text-muted-foreground/70 group-hover:text-foreground transition-colors">
                                {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        )}
                        {!hasChildren && <div className="w-4" />}

                        <div className={cn(
                            "p-1 rounded-sm",
                            node.type === 'database' ? "text-primary bg-primary/10" :
                                node.type === 'table' ? "text-amber-500 bg-amber-500/10" :
                                    "text-muted-foreground"
                        )}>
                            {node.type === 'database' && <DatabaseIcon size={12} />}
                            {node.type === 'table' && <TableIcon size={12} />}
                            {node.type === 'column' && <Columns size={12} />}
                        </div>

                        <span className={cn(
                            "text-[12px] truncate",
                            node.type === 'database' ? "font-bold text-foreground/90" :
                                node.type === 'table' ? "font-semibold text-foreground/80" :
                                    "text-muted-foreground"
                        )}>
                            {node.name}
                        </span>

                        {node.loading && (
                            <RefreshCw size={10} className="animate-spin text-muted-foreground" />
                        )}
                    </div>
                </div>

                {node.expanded && node.children && (
                    <div className="animate-in slide-in-from-left-1 duration-200">
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (!connected) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card/10">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-4 text-muted-foreground/30">
                    <DatabaseIcon size={24} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Explorer</p>
                <p className="text-[11px] text-muted-foreground mt-1">Connect to a database to browse schema</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card/30">
            <div className="p-3 pb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    Schema Browser
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] font-bold bg-muted/50 border-none">{databases.length}</Badge>
                </h3>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                    <RefreshCw size={12} />
                </Button>
            </div>

            <div className="px-3 pb-2">
                <div className="relative group">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        className="h-7 pl-7 text-[11px] bg-background/50 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 h-8"
                        placeholder="Search databases/tables..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto pb-4 custom-scrollbar">
                {nodes.map(node => renderNode(node))}
            </div>
        </div>
    );
}
