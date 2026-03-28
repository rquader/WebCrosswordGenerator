import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
// Self-hosted fonts — loaded from node_modules, zero external requests
// @ts-ignore — fontsource CSS import
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
