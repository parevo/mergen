import React, { useState, useEffect } from 'react';
import { ConnectionConfig } from '../types';
import {
    X,
    FlaskConical,
    Save,
    Database,
    ShieldCheck,
    Globe,
    KeyRound,
    Hash,
    ChevronDown,
    ChevronRight,
    Lock,
    Server,
    Palette,
    Shield,
    Key,
    FileKey,
    AlertTriangle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
    title: string;
    initialConfig?: ConnectionConfig;
    initialName?: string;
    onSave: (name: string, config: ConnectionConfig) => Promise<boolean>;
    onClose: () => void;
    onTest: (config: ConnectionConfig) => Promise<boolean>;
    loading: boolean;
}

const DRIVERS = [
    { id: 'mysql', name: 'MySQL / MariaDB', defaultPort: 3306 },
    { id: 'postgres', name: 'PostgreSQL', defaultPort: 5432 },
];

const ENV_COLORS = [
    { name: 'Production', color: '#ef4444', hint: 'Red - Handle with care!' },
    { name: 'Staging', color: '#f97316', hint: 'Orange - Pre-production' },
    { name: 'Testing', color: '#eab308', hint: 'Yellow - Safe to experiment' },
    { name: 'Development', color: '#22c55e', hint: 'Green - Local dev' },
    { name: 'Custom', color: '#3b82f6', hint: 'Blue - Other' },
    { name: 'None', color: '', hint: 'No color coding' },
];

const SSL_MODES = [
    { id: 'disable', name: 'Disable', desc: 'No SSL' },
    { id: 'require', name: 'Require', desc: 'SSL required, no verify' },
    { id: 'verify-ca', name: 'Verify CA', desc: 'Verify server certificate' },
    { id: 'verify-full', name: 'Verify Full', desc: 'Verify cert + hostname' },
];

export function ConnectionModal({ title, initialConfig, initialName, onSave, onClose, onTest, loading }: Props) {
    const [config, setConfig] = useState<ConnectionConfig>(initialConfig || {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: '',
        color: '',
        useSSL: false,
        sslMode: 'disable',
        sslCACert: '',
        sslClientCert: '',
        sslClientKey: '',
        useSSHTunnel: false,
        sshHost: '',
        sshPort: 22,
        sshUser: '',
        sshPassword: '',
        sshPrivateKey: '',
        sshPassphrase: '',
    });
    const [name, setName] = useState(initialName || '');
    const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
    const [sshOpen, setSSHOpen] = useState(initialConfig?.useSSHTunnel || false);
    const [sslOpen, setSSLOpen] = useState(initialConfig?.useSSL || false);

    const handleDriverChange = (val: string) => {
        const driver = DRIVERS.find(d => d.id === val);
        setConfig({
            ...config,
            type: val,
            port: driver ? driver.defaultPort : config.port
        });
    };

    const handleTest = async () => {
        setTestResult(null);
        const result = await onTest(config);
        setTestResult(result ? 'success' : 'failed');
        setTimeout(() => setTestResult(null), 3000);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        const success = await onSave(name, config);
        if (success) onClose();
    };

    const isProd = config.color === '#ef4444';

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "sm:max-w-[520px] bg-card border-border/40 shadow-2xl p-0 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
                    config.color && `ring-2 ring-offset-2 ring-offset-background`
                )}
                style={{
                    borderColor: config.color || undefined,
                    boxShadow: config.color ? `0 0 30px ${config.color}30` : undefined
                }}
            >
                <DialogHeader className="p-6 pb-2 bg-muted/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20"
                            style={{ backgroundColor: config.color ? `${config.color}20` : undefined, borderColor: config.color || undefined }}
                        >
                            <Database size={20} style={{ color: config.color || undefined }} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black tracking-tight uppercase italic">
                                {title}
                            </DialogTitle>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1 opacity-60">Engine Configuration</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-5 pt-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                Display Name
                            </Label>
                            <Input
                                className="h-9 text-[11px] font-bold bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Production DB"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                Engine Type
                            </Label>
                            <Select value={config.type} onValueChange={handleDriverChange}>
                                <SelectTrigger className="h-9 text-[11px] font-bold bg-background/50 border-muted-foreground/20">
                                    <SelectValue placeholder="Select Engine" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DRIVERS.map(driver => (
                                        <SelectItem key={driver.id} value={driver.id} className="text-[11px] font-bold uppercase tracking-tight">
                                            {driver.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                            <Palette size={11} className="text-primary/60" />
                            Environment Color
                        </Label>
                        <div className="flex gap-2 flex-wrap">
                            {ENV_COLORS.map(env => (
                                <button
                                    key={env.name}
                                    type="button"
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all",
                                        config.color === env.color
                                            ? "ring-2 ring-offset-1 ring-offset-background scale-105"
                                            : "opacity-70 hover:opacity-100"
                                    )}
                                    style={{
                                        backgroundColor: env.color ? `${env.color}20` : 'transparent',
                                        borderColor: env.color || 'var(--border)',
                                        color: env.color || 'var(--muted-foreground)',
                                    }}
                                    onClick={() => setConfig({ ...config, color: env.color })}
                                    title={env.hint}
                                >
                                    {env.color && (
                                        <span
                                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                                            style={{ backgroundColor: env.color }}
                                        />
                                    )}
                                    {env.name}
                                </button>
                            ))}
                        </div>
                        {isProd && (
                            <div className="flex items-center gap-2 text-[10px] text-orange-500 font-bold uppercase tracking-wide mt-1">
                                <AlertTriangle size={12} />
                                <span>Production environment - Be careful!</span>
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Connection Details */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                <Globe size={11} className="text-primary/60" />
                                Host address
                            </Label>
                            <Input
                                className="h-9 text-[11px] font-mono bg-background/50"
                                value={config.host}
                                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                placeholder="127.0.0.1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                <Hash size={11} className="text-primary/60" />
                                Port
                            </Label>
                            <Input
                                className="h-9 text-[11px] font-mono bg-background/50"
                                type="number"
                                value={config.port}
                                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 3306 })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                <ShieldCheck size={11} className="text-primary/60" />
                                Username
                            </Label>
                            <Input
                                className="h-9 text-[11px] font-mono bg-background/50"
                                value={config.user}
                                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                                placeholder="root"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                                <KeyRound size={11} className="text-primary/60" />
                                Password
                            </Label>
                            <Input
                                className="h-9 text-[11px] font-mono bg-background/50"
                                type="password"
                                value={config.password}
                                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                            Initial Database / Schema
                        </Label>
                        <Input
                            className="h-9 text-[11px] font-mono bg-background/50 border-muted-foreground/20"
                            value={config.database}
                            onChange={(e) => setConfig({ ...config, database: e.target.value })}
                            placeholder="my_app_production"
                        />
                    </div>

                    {/* SSH Tunnel Section */}
                    <Collapsible open={sshOpen} onOpenChange={setSSHOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40">
                            <div className="flex items-center gap-2">
                                <Server size={14} className="text-blue-500" />
                                <span className="text-[11px] font-black uppercase tracking-wide">SSH Tunnel</span>
                                {config.useSSHTunnel && (
                                    <Badge variant="secondary" className="text-[8px] bg-blue-500/20 text-blue-500 h-4 px-1.5">ENABLED</Badge>
                                )}
                            </div>
                            {sshOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-4 p-4 rounded-lg border border-border/40 bg-muted/10">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    Enable SSH Tunnel
                                </Label>
                                <Switch
                                    checked={config.useSSHTunnel}
                                    onCheckedChange={(checked) => setConfig({ ...config, useSSHTunnel: checked })}
                                />
                            </div>

                            {config.useSSHTunnel && (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">SSH Host</Label>
                                            <Input
                                                className="h-8 text-[10px] font-mono bg-background/50"
                                                value={config.sshHost}
                                                onChange={(e) => setConfig({ ...config, sshHost: e.target.value })}
                                                placeholder="bastion.example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">SSH Port</Label>
                                            <Input
                                                className="h-8 text-[10px] font-mono bg-background/50"
                                                type="number"
                                                value={config.sshPort || 22}
                                                onChange={(e) => setConfig({ ...config, sshPort: parseInt(e.target.value) || 22 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                <Key size={10} /> SSH User
                                            </Label>
                                            <Input
                                                className="h-8 text-[10px] font-mono bg-background/50"
                                                value={config.sshUser}
                                                onChange={(e) => setConfig({ ...config, sshUser: e.target.value })}
                                                placeholder="ubuntu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">SSH Password</Label>
                                            <Input
                                                className="h-8 text-[10px] font-mono bg-background/50"
                                                type="password"
                                                value={config.sshPassword}
                                                onChange={(e) => setConfig({ ...config, sshPassword: e.target.value })}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                            <FileKey size={10} /> Private Key (PEM)
                                        </Label>
                                        <Textarea
                                            className="h-20 text-[9px] font-mono bg-background/50 resize-none"
                                            value={config.sshPrivateKey}
                                            onChange={(e) => setConfig({ ...config, sshPrivateKey: e.target.value })}
                                            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Key Passphrase</Label>
                                        <Input
                                            className="h-8 text-[10px] font-mono bg-background/50"
                                            type="password"
                                            value={config.sshPassphrase}
                                            onChange={(e) => setConfig({ ...config, sshPassphrase: e.target.value })}
                                            placeholder="If key is encrypted"
                                        />
                                    </div>
                                </>
                            )}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* SSL/TLS Section */}
                    <Collapsible open={sslOpen} onOpenChange={setSSLOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-green-500" />
                                <span className="text-[11px] font-black uppercase tracking-wide">SSL / TLS</span>
                                {config.useSSL && (
                                    <Badge variant="secondary" className="text-[8px] bg-green-500/20 text-green-500 h-4 px-1.5">ENCRYPTED</Badge>
                                )}
                            </div>
                            {sslOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-4 p-4 rounded-lg border border-border/40 bg-muted/10">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    Enable SSL/TLS
                                </Label>
                                <Switch
                                    checked={config.useSSL}
                                    onCheckedChange={(checked) => setConfig({ ...config, useSSL: checked })}
                                />
                            </div>

                            {config.useSSL && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">SSL Mode</Label>
                                        <Select
                                            value={config.sslMode || 'require'}
                                            onValueChange={(val) => setConfig({ ...config, sslMode: val })}
                                        >
                                            <SelectTrigger className="h-8 text-[10px] font-bold bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SSL_MODES.map(mode => (
                                                    <SelectItem key={mode.id} value={mode.id} className="text-[10px]">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{mode.name}</span>
                                                            <span className="text-muted-foreground text-[9px]">{mode.desc}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">CA Certificate</Label>
                                        <Textarea
                                            className="h-16 text-[9px] font-mono bg-background/50 resize-none"
                                            value={config.sslCACert}
                                            onChange={(e) => setConfig({ ...config, sslCACert: e.target.value })}
                                            placeholder="Paste CA cert or leave empty for system CA"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Client Certificate</Label>
                                            <Textarea
                                                className="h-16 text-[9px] font-mono bg-background/50 resize-none"
                                                value={config.sslClientCert}
                                                onChange={(e) => setConfig({ ...config, sslClientCert: e.target.value })}
                                                placeholder="Optional client cert"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Client Key</Label>
                                            <Textarea
                                                className="h-16 text-[9px] font-mono bg-background/50 resize-none"
                                                value={config.sslClientKey}
                                                onChange={(e) => setConfig({ ...config, sslClientKey: e.target.value })}
                                                placeholder="Optional client key"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </CollapsibleContent>
                    </Collapsible>

                    {testResult && (
                        <div className={cn(
                            "p-3 rounded-xl border text-[11px] font-black flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300 uppercase tracking-widest",
                            testResult === 'success' ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-destructive/10 border-destructive/30 text-destructive"
                        )}>
                            <span>{testResult === 'success' ? '✓ Connector Handshake OK' : '✗ Network/Auth Timeout'}</span>
                            {testResult === 'success' && <Badge variant="secondary" className="text-[8px] bg-green-500 text-white h-4 px-1.5 border-none">LINKED</Badge>}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/20 border-t border-border/40 gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1 h-9 text-[10px] font-black uppercase italic tracking-[0.2em] opacity-60 hover:opacity-100 hover:bg-primary/5 hover:text-primary transition-all"
                        onClick={handleTest}
                        disabled={loading}
                    >
                        <FlaskConical size={14} className="mr-2" />
                        Dry Run
                    </Button>
                    <div className="flex gap-2 flex-1">
                        <Button variant="ghost" className="flex-1 h-9 text-[10px] font-black uppercase tracking-widest" onClick={onClose}>
                            Esc
                        </Button>
                        <Button
                            className={cn(
                                "flex-1 h-9 text-[10px] font-black uppercase tracking-widest shadow-lg text-primary-foreground",
                                isProd ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                            )}
                            onClick={handleSave}
                            disabled={loading || !name.trim()}
                        >
                            <Save size={14} className="mr-2" />
                            DEPLOY
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
