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

  const EXTERNAL_URLS: Record<string, string> = {
    '/home':   'https://hackathon-host-dispatcher.vercel.app',
    '/loader': 'https://hackathon-host-loader.vercel.app',
    '/driver': 'https://kraken-hack-driver.vercel.app',
    '/store':  'https://hackathon-host-store.vercel.app',
  }

  useEffect(() => {
    if (!user && !isPublic) navigate("/")
    else if (user && (isPublic || !canAccess(user.role, path))) {
      const rolePath = ROLE_HOME[user.role]
      const externalUrl = EXTERNAL_URLS[rolePath]
      if (externalUrl) {
        window.location.href = externalUrl
      } else {
        navigate(rolePath)
      }
    }
  }, [user, path, isPublic])

  if (path === "/" || path === "/login") return <LoginPage navigate={navigate} />
  if (path === "/forgot-password") return <ForgotPasswordPage navigate={navigate} />
  if (path === "/verify-code") return <VerifyCodePage navigate={navigate} />
  if (!user) return null

  return <PlaceholderPage navigate={navigate} />
}
