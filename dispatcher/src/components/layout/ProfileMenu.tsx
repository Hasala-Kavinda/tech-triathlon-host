import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { clearSession } from '../../auth/session';
import { UnstyledButton } from '../ui';

export function ProfileMenu({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "https://kraken-hack-login.vercel.app/";
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function signOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await apiRequest<void>("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined)
    clearSession()
    setOpen(false)
    const urlObj = new URL(LOGIN_URL, window.location.origin);
    urlObj.searchParams.set("logged_out", "1");
    window.location.replace(urlObj.toString());
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <UnstyledButton
        aria-expanded={open}
        aria-haspopup="menu"
        className="profile"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="profile__avatar">NP</span>
        <span>Nuwan P.</span>
        <ChevronDown
          aria-hidden="true"
          className={open ? "profile__chevron profile__chevron--open" : "profile__chevron"}
          size={15}
        />
      </UnstyledButton>
      {open ? (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__user">
            <strong>Nuwan Perera</strong>
            <span>Dispatcher · <span className="data-text">DSP-1001</span></span>
          </div>
          <UnstyledButton
            className="profile-menu__item"
            onClick={signOut}
            role="menuitem"
          >
            <LogOut aria-hidden="true" size={17} />
            <span>Sign out</span>
          </UnstyledButton>
        </div>
      ) : null}
    </div>
  )
}
