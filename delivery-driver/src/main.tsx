// app/src/main.tsx - Figma Make clean entry point

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { AuthBoundary } from './auth/AuthBoundary';
import { registerPwa } from './pwa/register';

registerPwa();

document.title = 'Kraken-Driver';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthBoundary expectedRole="driver"><App /></AuthBoundary>
  </React.StrictMode>
);
