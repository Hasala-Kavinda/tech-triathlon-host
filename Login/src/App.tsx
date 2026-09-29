import { useState, useEffect } from "react"
import { useAuth } from "./auth/AuthContext"
import { PUBLIC_ROUTES, ROLE_HOME, canAccess } from "./auth/roles"
import { LoginPage } from "./pages/auth/LoginPage"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage"
import { VerifyCodePage } from "./pages/auth/VerifyCodePage"
import { PlaceholderPage } from "./pages/placeholder/PlaceholderPage"

function getPath() {
  return window.location.pathname || "/"
}

export default function App() {
  const { user } = useAuth()
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

  const isPublic = PUBLIC_ROUTES.includes(path)

  useEffect(() => {
    if (!user && !isPublic) navigate("/")
    else if (user && isPublic) navigate(ROLE_HOME[user.role])
    else if (user && !canAccess(user.role, path)) navigate(ROLE_HOME[user.role])
  }, [user, path, isPublic])

  if (path === "/" || path === "/login") return <LoginPage navigate={navigate} />
  if (path === "/forgot-password") return <ForgotPasswordPage navigate={navigate} />
  if (path === "/verify-code") return <VerifyCodePage navigate={navigate} />
  if (!user) return null

  return <PlaceholderPage navigate={navigate} />
}
