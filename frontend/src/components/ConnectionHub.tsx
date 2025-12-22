import React from 'react';
import { ConnectionConfig, SavedConnection } from '../types';
import {
    Plus,
    Database,
    Server,
    Activity,
    Trash2,
    Settings2,
    Globe,
    Clock,
    ArrowRight,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface Props {
    savedConnections: SavedConnection[];
    onConnect: (config: ConnectionConfig) => Promise<boolean>;
    onOpenModal: (config?: ConnectionConfig, name?: string) => void;
    onDelete: (name: string) => void;
    loading: boolean;
}

const getDriverDisplay = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'mysql': return { name: 'MySQL', color: 'text-blue-400', bg: 'bg-blue-400/10' };
        case 'postgres': return { name: 'Postgres', color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
        default: return { name: 'MySQL', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    }
}

export function ConnectionHub({ savedConnections, onConnect, onOpenModal, onDelete, loading }: Props) {
    return (
        <div className="h-full w-full bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 overflow-auto">
            <div className="max-w-5xl w-full space-y-12">
                {/* Hero Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-6 shadow-2xl shadow-primary/20 ring-1 ring-primary/20 animate-bounce-slow">
                        <Database size={40} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase italic">
                        RuneDB
                    </h1>
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.3em] max-w-md mx-auto opacity-60 leading-relaxed">
                        The next generation multi-database management experience.
                    </p>
                </div>

                {/* Content Tabs/Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* New Connection Hero Card */}
                    <Card
                        className="group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-2 border-dashed border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 h-48 flex flex-col items-center justify-center gap-4 shadow-xl shadow-primary/5"
                        onClick={() => onOpenModal()}
                    >
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:rotate-90 transition-transform duration-500">
                            <Plus size={24} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-sm uppercase tracking-widest text-primary">New Connection</h3>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">Deploy a new instance</p>
                        </div>
                    </Card>

                    {/* Saved Connection Cards */}
                    {savedConnections.map((conn) => {
                        const driver = getDriverDisplay(conn.config.type);
                        return (
                            <Card
                                key={conn.name}
                                className="group overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-border/40 bg-card/50 backdrop-blur-sm h-48 flex flex-col justify-between"
                            >
                                <CardContent className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", driver.bg, driver.color)}>
                                            <Server size={18} />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-muted"
                                                onClick={(e) => { e.stopPropagation(); onOpenModal(conn.config, conn.name); }}
                                            >
                                                <Settings2 size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                onClick={(e) => { e.stopPropagation(); onDelete(conn.name); }}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-black text-base tracking-tight uppercase truncate mr-2">{conn.name}</h3>
                                            <Badge variant="outline" className={cn("text-[8px] font-black tracking-widest uppercase border-none h-4 px-1", driver.bg, driver.color)}>
                                                {driver.name}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                            <Globe size={10} className="opacity-40" />
                                            {conn.config.host}:{conn.config.port}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-mono">
                                            <Zap size={10} className="opacity-40" />
                                            <span className="opacity-50">USER:</span> {conn.config.user}
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-8 text-[11px] font-black uppercase tracking-widest group-hover:bg-primary transition-all mt-4"
                                        onClick={() => onConnect(conn.config)}
                                        disabled={loading}
                                    >
                                        {loading ? "INITIALIZING..." : (
                                            <>
                                                Go Online <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Footer/Quick Stats */}
                <div className="pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-8 text-muted-foreground/40">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Activity size={14} />
                            Engine Status: Optimal
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={14} />
                            Drivers Loaded: {DRIVERS_COUNT}
                        </div>
                    </div>
                    <div className="text-[10px] font-mono tracking-tighter">
                        v0.1.0-ALPHA-BUILD-2025
                    </div>
                </div>
            </div>
        </div>
    );
}

const DRIVERS_COUNT = 2; // MySQL and Postgres
