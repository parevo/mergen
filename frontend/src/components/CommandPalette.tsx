import { useEffect, useState, useCallback } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Database,
    Plus,
    History,
    Moon,
    Sun,
    Settings,
    Search,
    Table2,
    Code2,
    RefreshCw,
    LogOut,
    Palette
} from 'lucide-react';

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    databases: { name: string }[];
    currentDb: string;
    connected: boolean;
    onNewQueryTab: () => void;
    onSwitchDb: (db: string) => void;
    onOpenHistory: () => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    onOpenSettings: () => void;
}

export function CommandPalette({
    open,
    onOpenChange,
    databases,
    currentDb,
    connected,
    onNewQueryTab,
    onSwitchDb,
    onOpenHistory,
    onDisconnect,
    onRefresh,
    onOpenSettings
}: CommandPaletteProps) {
    const runAction = (action: () => void) => {
        action();
        onOpenChange(false);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Quick Actions */}
                <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => runAction(onNewQueryTab)}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>New Query Tab</span>
                        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            ⌘T
                        </kbd>
                    </CommandItem>
                    <CommandItem onSelect={() => runAction(onOpenHistory)}>
                        <History className="mr-2 h-4 w-4" />
                        <span>Query History</span>
                    </CommandItem>
                    {connected && (
                        <CommandItem onSelect={() => runAction(onRefresh)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            <span>Refresh Schema</span>
                        </CommandItem>
                    )}
                </CommandGroup>

                {/* Database Actions */}
                {connected && databases.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Switch Database">
                            {databases.map((db) => (
                                <CommandItem
                                    key={db.name}
                                    value={`db-${db.name}`}
                                    onSelect={() => runAction(() => onSwitchDb(db.name))}
                                >
                                    <Database className="mr-2 h-4 w-4" />
                                    <span>{db.name}</span>
                                    {db.name === currentDb && (
                                        <span className="ml-auto text-[10px] text-primary font-bold uppercase">Active</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {/* Settings & Connection */}
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runAction(onOpenSettings)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Connection Settings</span>
                    </CommandItem>
                    {connected && (
                        <CommandItem onSelect={() => runAction(onDisconnect)} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Disconnect</span>
                        </CommandItem>
                    )}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}

// Hook to manage command palette state
export function useCommandPalette() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return { open, setOpen };
}
