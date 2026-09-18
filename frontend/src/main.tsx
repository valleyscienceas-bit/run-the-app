import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PaletteSwitcher } from './components/PaletteSwitcher';
import { applyPalette, loadPalettePreference } from './lib/paletteThemes';
import './index.css';

// Suppress Vite WebSocket errors in the UI
if (typeof window !== 'undefined') {
  applyPalette(loadPalettePreference());
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason.message?.includes('WebSocket') || event.reason.stack?.includes('vite'))) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary label="Valley Science">
      <App />
      <PaletteSwitcher />
    </ErrorBoundary>
  </StrictMode>,
);
