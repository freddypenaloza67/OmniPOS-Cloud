import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker with Auto-Update Check
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates on every page load
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('SW registration skipped:', err);
      });

    // Clear stale caches from v1 if present
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          if (name !== 'omnipos-cache-v4') {
            caches.delete(name);
          }
        }
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
