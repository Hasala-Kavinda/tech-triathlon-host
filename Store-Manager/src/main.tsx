import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { AuthBoundary } from "./auth/AuthBoundary"
import { registerPwa } from "./pwa/register"

registerPwa()

async function start() {
  document.title = "Kraken-Store-Manager"
  // The Figma Make HTML shell does not inject Vite's usual React refresh preamble.
  if (import.meta.env.MODE === "development") {
    const refreshPath = "/@react-refresh"
    const RefreshRuntime = await import(/* @vite-ignore */ refreshPath)
    RefreshRuntime.default.injectIntoGlobalHook(window)
    Object.assign(window, {
      $RefreshReg$: () => undefined,
      $RefreshSig$: () => (type: unknown) => type,
    })
  }

  const { default: App } = await import("./App")
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AuthBoundary expectedRole="store_manager"><App /></AuthBoundary>
    </React.StrictMode>,
  )
}

void start()
