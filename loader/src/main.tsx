import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthBoundary } from './auth/AuthBoundary'
import { registerPwa } from './pwa/register'

registerPwa()

document.title = 'Kraken-Loader'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthBoundary expectedRole="loader"><App /></AuthBoundary>
  </React.StrictMode>,
)
