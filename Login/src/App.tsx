import { useState, useEffect } from "react"
import { LoginPage } from "./pages/auth/LoginPage"

function getPath() {
  return window.location.pathname || "/"
}

export default function App() {
  const [path, setPath] = useState(getPath)

  function navigate(to: string) {
    window.history.pushState({}, "", to)
    setPath(to)
  }

  useEffect(() => {
    const handler = () => setPath(getPath())
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [])

  useEffect(() => {
    if (path !== "/" && path !== "/login") navigate("/")
  }, [path])

  if (path === "/" || path === "/login") return <LoginPage navigate={navigate} />
  return null
}
