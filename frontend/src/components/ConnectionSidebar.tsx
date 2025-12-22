import React from 'react';
import { ConnectionConfig, SavedConnection } from '../types';
import {
    Plus,
    Settings2,
    Trash2,
    Database,
    Unplug,
    Server,
    LayoutGrid,
    Search,
    Hexagon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
    onConnect: (config: ConnectionConfig) => Promise<boolean>;
    savedConnections: SavedConnection[];
    onDeleteConnection: (name: string) => void;
    loading: boolean;
    connected: boolean;
    onDisconnect: () => void;
    onOpenModal: (config?: ConnectionConfig, name?: string) => void;
    activeName?: string;
    onGoToHub: () => void;
}

const getDriverColor = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'mysql': return 'text-blue-400';
        case 'postgres': return 'text-indigo-400';
        default: return 'text-muted-foreground/50';
    }
}

const getDriverBadge = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'mysql': return 'MY';
        case 'postgres': return 'PG';
        default: return 'SQL';
    }
}

export function ConnectionSidebar({
    onConnect,
    savedConnections,
    onDeleteConnection,
    loading,
    connected,
    onDisconnect,
    onOpenModal,
    activeName,
    onGoToHub
}: Props) {
    return (
        <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl border-r">
            {/* Sidebar Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b bg-background/40">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Server size={12} className="text-primary" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/80">Instances</h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={() => onOpenModal()}
                >
                    <Plus size={16} />
                </Button>
            </div>

            {/* Active Connection Section */}
            {connected && (
                <div className="p-3 animate-in slide-in-from-left duration-300">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Badge variant="outline" className="text-[8px] bg-background border-primary/20">LIVE</Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-tight truncate flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                {activeName || "Active Server"}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-mono opacity-60">Engine Authenticated</p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full h-7 text-[10px] font-black uppercase tracking-widest bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/10"
                            onClick={onDisconnect}
                        >
                            <Unplug size={12} className="mr-2" />
                            Kill Signal
                        </Button>
                    </div>
                </div>
            )}

            {/* Search / Filter */}
            <div className="px-3 py-2">
                <div className="relative group">
                    <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Filter servers..."
                        className="h-7 pl-7 text-[10px] bg-background/50 border-muted-foreground/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all font-bold tracking-tight"
                    />
                </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Saved Connections List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    <div className="px-2 py-1 mb-1 flex items-center justify-between">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Workspace</p>
                        <Badge variant="secondary" className="h-3 text-[7px] px-1 font-black leading-none bg-muted-foreground/10 text-muted-foreground/60">{savedConnections.length}</Badge>
                    </div>
                    {savedConnections.map((conn) => (
                        <div
                            key={conn.name}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer border border-transparent",
                                connected && activeName === conn.name ? "bg-primary/10 text-primary border-primary/20" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground hover:border-border/40"
                            )}
                            onClick={() => onConnect(conn.config)}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative">
                                    <Hexagon size={13} className={getDriverColor(conn.config.type)} />
                                    <span className="absolute inset-0 flex items-center justify-center text-[6px] font-black tracking-tighter text-foreground/80">
                                        {getDriverBadge(conn.config.type)}
                                    </span>
                                </div>
                                <span className="text-[11px] font-bold truncate tracking-tight">{conn.name}</span>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); onOpenModal(conn.config, conn.name); }}
                                >
                                    <Settings2 size={12} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); onDeleteConnection(conn.name); }}
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {savedConnections.length === 0 && (
                        <div className="text-center py-12 px-4 opacity-30 select-none">
                            <Hexagon size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No nodes found</p>
                            <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase mt-3 hover:bg-primary/5" onClick={() => onOpenModal()}>Initialize One</Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-2 border-t bg-background/20">
                <Button
                    variant="ghost"
                    className="w-full h-8 text-[10px] font-black uppercase tracking-widest gap-2 opacity-60 hover:opacity-100 hover:bg-primary/5 hover:text-primary transition-all"
                    onClick={onGoToHub}
                >
                    <LayoutGrid size={14} />
                    Engine Hub
                </Button>
            </div>
        </div>
    );
}
