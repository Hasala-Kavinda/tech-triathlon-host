import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  caught: boolean
}

/**
 * L-H-3 — Loader Error Boundary
 *
 * Catches unexpected render-time exceptions anywhere in the Loader tree and
 * shows a clear recovery UI. It does NOT:
 * - call reconcile() / confirm() / any backend mutation
 * - retry automatically
 * - expose raw stack traces to the user
 */
export class LoaderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { caught: false }
  }

  static getDerivedStateFromError(): State {
    return { caught: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for developer diagnostics only — never shown to the user.
    console.error("[LoaderErrorBoundary] Unexpected render error:", error, info.componentStack)
  }

  render() {
    if (this.state.caught) {
      return (
        <main
          style={{
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            maxWidth: 480,
            margin: "0 auto",
          }}
          role="alert"
          aria-live="assertive"
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: "1rem", color: "#555" }}>
            An unexpected error prevented this screen from loading. Your load
            record has not been changed.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.2rem",
              background: "#1a56db",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Return to available work
          </a>
        </main>
      )
    }

    return this.props.children
  }
}
