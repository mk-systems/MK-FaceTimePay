import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR WebSocket connection errors in sandboxed iframe environment
if (typeof window !== 'undefined') {
  try {
    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
      // @ts-ignore
      const CustomWebSocket = function (url, protocols) {
        const urlStr = String(url || '');
        if (urlStr.includes('vite') || urlStr.includes('hmr') || urlStr.includes('3000')) {
          const listeners: { [key: string]: any[] } = {};
          const dummySocket = {
            url: urlStr,
            readyState: 3, // CLOSED
            bufferedAmount: 0,
            extensions: '',
            protocol: '',
            binaryType: 'blob' as BinaryType,
            onopen: null,
            onerror: null,
            onclose: null,
            onmessage: null,
            send: () => {},
            close: () => {},
            addEventListener: function(type: string, listener: any) {
              if (!listeners[type]) listeners[type] = [];
              listeners[type].push(listener);
            },
            removeEventListener: function(type: string, listener: any) {
              if (listeners[type]) {
                listeners[type] = listeners[type].filter(l => l !== listener);
              }
            },
            dispatchEvent: function(event: any) {
              const type = event.type;
              if (listeners[type]) {
                listeners[type].forEach(l => {
                  try { l(event); } catch (_) {}
                });
              }
              const handlerName = 'on' + type;
              // @ts-ignore
              if (typeof this[handlerName] === 'function') {
                // @ts-ignore
                try { this[handlerName](event); } catch (_) {}
              }
              return true;
            },
          };

          // Dispatch a close event silently so Vite client knows it is closed without throwing errors
          setTimeout(() => {
            try {
              const event = new CloseEvent('close', {
                code: 1006,
                reason: 'Vite HMR WebSocket connection suppressed in sandboxed container',
                wasClean: false,
              });
              dummySocket.dispatchEvent(event);
            } catch (_) {}
          }, 50);

          return dummySocket;
        }
        return new OriginalWebSocket(url, protocols);
      };

      CustomWebSocket.prototype = OriginalWebSocket.prototype;
      // @ts-ignore
      CustomWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
      // @ts-ignore
      CustomWebSocket.OPEN = OriginalWebSocket.OPEN;
      // @ts-ignore
      CustomWebSocket.CLOSING = OriginalWebSocket.CLOSING;
      // @ts-ignore
      CustomWebSocket.CLOSED = OriginalWebSocket.CLOSED;

      try {
        Object.defineProperty(window, 'WebSocket', {
          value: CustomWebSocket,
          writable: true,
          configurable: true
        });
      } catch (err) {
        // Fallback to standard assignment
        // @ts-ignore
        window.WebSocket = CustomWebSocket;
      }
    }
  } catch (e) {
    // If browser sandbox prevents overriding WebSocket entirely, we gracefully continue.
    // Our global event listeners below will catch and suppress any errors.
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (reasonStr.includes('WebSocket') || reasonStr.includes('websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    if (msg.includes('WebSocket') || msg.includes('websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
