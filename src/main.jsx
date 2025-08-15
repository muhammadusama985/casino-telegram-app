import './polyfills.js';   // <-- must be first
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TonConnectUIProvider } from "@tonconnect/ui-react";


createRoot(document.getElementById('root')).render(

  <TonConnectUIProvider manifestUrl="https://casino-telegram-app.vercel.app/tonconnect-manifest.json">
    <StrictMode>

      <App />
    </StrictMode>

  </TonConnectUIProvider>



)
