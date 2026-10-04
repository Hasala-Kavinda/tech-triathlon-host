import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Text } from "../ui/Text";
import { readSession } from "../../auth/session";
export function LoaderIdentity() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const session = readSession()
  const userName = session?.user?.name || "Loader"
  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div className="loader-identity" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="loader-identity__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="loader-identity__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="loader-identity__summary">
          <Text as="span" variant="label">
            {userName}
          </Text>
          <Text as="span" variant="caption">
            Loader
          </Text>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="identity-menu" role="menu">
          <div className="identity-menu__header">
            <span className="identity-menu__avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <Text variant="body-strong">{userName}</Text>
              <Text variant="caption">Loader</Text>
            </div>
          </div>
          <div className="identity-menu__device">
            <UserRound aria-hidden="true" />
            <div>
              <Text variant="label">Shared warehouse tablet</Text>
              <Text variant="caption">Keep your session secure</Text>
            </div>
          </div>
          <button
            className="identity-menu__action"
            role="menuitem"
            type="button"
            onClick={() => {
              if (isLoggingOut) return;
              setIsLoggingOut(true);
              try { sessionStorage.removeItem("waylink.role.session"); } catch {}
              const loginUrl = import.meta.env.VITE_LOGIN_URL || "http://localhost:5173/";
              const urlObj = new URL(loginUrl, window.location.origin);
              urlObj.searchParams.set("logged_out", "1");
              window.location.replace(urlObj.toString());
            }}
          >
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
