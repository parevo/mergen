import { useState, useEffect } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { WindowMinimise, WindowToggleMaximise, Quit, Environment } from "../../wailsjs/runtime/runtime";

export function WindowControls() {
    return (
        <div className="flex items-center h-full -mr-2" style={{ "--wails-draggable": "no-drag" } as any}>
            {/* drag-region-no is crucial if the header is draggable */}
            <button
                onClick={WindowMinimise}
                className="h-full w-12 flex items-center justify-center hover:bg-white/10 text-muted-foreground transition-colors outline-none focus:outline-none"
            >
                <Minus size={16} />
            </button>
            <button
                onClick={WindowToggleMaximise}
                className="h-full w-12 flex items-center justify-center hover:bg-white/10 text-muted-foreground transition-colors outline-none focus:outline-none"
            >
                <Square size={14} />
            </button>
            <button
                onClick={Quit}
                className="h-full w-12 flex items-center justify-center hover:bg-red-500 hover:text-white text-muted-foreground transition-colors outline-none focus:outline-none rounded-tr-xl"
            >
                <X size={16} />
            </button>
        </div>
    );
}
