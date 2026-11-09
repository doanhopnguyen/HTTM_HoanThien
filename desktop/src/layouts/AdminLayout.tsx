import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  TriangleAlert,
  Camera,
  Users,
  ChartColumn,
  Settings,
  Waves,
  LogOut,
} from "lucide-react";
import { api } from "../api/client";
import { errorMessage } from "@pool-safety/shared";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useRealtime } from "../hooks/useRealtime";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { Button, Toast } from "../components/ui";
import { ActiveIncidentPanel } from "../features/incidents/ActiveIncidentPanel";
const links = [
  ["/", "Dashboard", LayoutDashboard],
  ["/monitor", "Live monitor", Video],
  ["/incidents", "Incidents", TriangleAlert],
  ["/cameras", "Cameras", Camera],
  ["/users", "Users", Users],
  ["/reports", "Reports", ChartColumn],
  ["/settings", "Settings", Settings],
] as const;
export function AdminLayout() {
  useRealtime();
  const user = useAuthStore((s) => s.user)!;
  const connection = useUiStore((s) => s.connection);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <Waves size={30} />
          <div>
            POOL SAFETY<small>MONITORING CENTER</small>
          </div>
        </div>
        <div className="sidebar-label">CONTROL CENTER</div>
        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${connection}`} />
          {connection === "connected"
            ? "Realtime connected"
            : connection === "connecting"
              ? "Connecting…"
              : "Realtime disconnected"}
        </div>
      </aside>
      <div className="main-column">
        <header className="app-header">
          <div>
            <strong>Pool Safety Monitoring</strong>
            <small>Single pool control center</small>
          </div>
          <div className="actions">
            <NotificationBell />
            <div className="avatar">{user.fullName.slice(0, 1)}</div>
            <div>
              <strong>{user.fullName}</strong>
              <small>
                {user.role === "ADMIN" ? "Administrator" : "Lifeguard"}
              </small>
            </div>
            <Button
              variant="ghost"
              aria-label="Logout"
              onClick={() =>
                void api.auth
                  .logout()
                  .catch((e) =>
                    useUiStore.getState().notify(errorMessage(e), "error"),
                  )
              }
            >
              <LogOut size={19} />
            </Button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <ActiveIncidentPanel />
      <Toast />
    </div>
  );
}
