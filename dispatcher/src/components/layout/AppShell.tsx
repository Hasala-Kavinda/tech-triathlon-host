import { CalendarDays, Home, LayoutDashboard, MessageSquareText, ClipboardList, Clock3 } from 'lucide-react';
import wayTrackLogo from '../../assets/waytrack-logo.png';
import { UnstyledButton } from '../ui';
import { ProfileMenu } from './ProfileMenu';

export function AppShell({
  path,
  navigate,
  children,
}: {
  path: string
  navigate: (path: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <UnstyledButton className="brand" onClick={() => navigate("/home")}>
          <img alt="" className="brand__mark" src={wayTrackLogo} />
          <span>WayTrack</span>
        </UnstyledButton>
        <div className="topbar__spacer" />
        <div className="topbar__date">
          <CalendarDays aria-hidden="true" size={16} /> Sun 27 Sep
        </div>
        <div className="sync-state">
          <span /> Synced
        </div>
        <ProfileMenu navigate={navigate} />
      </header>
      <aside className="sidebar" aria-label="Primary navigation">
        <nav className="sidebar__nav">
          <UnstyledButton
            className={
              path === "/home" ? "nav-item nav-item--active" : "nav-item"
            }
            onClick={() => navigate("/home")}
          >
            <Home aria-hidden="true" size={20} />
            <span>Home</span>
          </UnstyledButton>
          <UnstyledButton
            className={
              path === "/schedule" ? "nav-item nav-item--active" : "nav-item"
            }
            onClick={() => navigate("/schedule")}
          >
            <CalendarDays aria-hidden="true" size={20} />
            <span>Schedule</span>
          </UnstyledButton>
          <UnstyledButton
            className={
              path.startsWith("/monitor/") && !path.includes("remarks=open")
                ? "nav-item nav-item--active"
                : "nav-item"
            }
            onClick={() => navigate("/monitor/WP-LB-4521")}
          >
            <LayoutDashboard aria-hidden="true" size={20} />
            <span>Live</span>
          </UnstyledButton>
          <UnstyledButton
            className={
              path.includes("remarks=open")
                ? "nav-item nav-item--active"
                : "nav-item"
            }
            onClick={() => navigate("/monitor/WP-LB-4521?remarks=open")}
          >
            <MessageSquareText aria-hidden="true" size={20} />
            <span>Remarks</span>
          </UnstyledButton>
          <UnstyledButton
            className={
              path === "/orders" ? "nav-item nav-item--active" : "nav-item"
            }
            onClick={() => navigate("/orders")}
          >
            <ClipboardList aria-hidden="true" size={20} />
            <span>Order log</span>
          </UnstyledButton>
        </nav>
        <div className="sidebar__hint">
          <Clock3 aria-hidden="true" size={18} />
          <div>
            <strong>Planning cutoff</strong>
            <span>Today at 16:00</span>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
