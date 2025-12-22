import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

import { Toaster } from "@/components/ui/sonner"

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App />
        <Toaster position="bottom-right" richColors />
    </React.StrictMode>
)
