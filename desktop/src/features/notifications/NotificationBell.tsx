import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { errorMessage, type Notification } from "@pool-safety/shared";
import { useNotificationStore } from "../../stores/notificationStore";
import { useUiStore } from "../../stores/uiStore";
import { Button, EmptyState, date } from "../../components/ui";
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, load, loadMore, hasMore, error } =
    useNotificationStore();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  async function select(n: Notification) {
    // Opening the incident must not depend on the read receipt succeeding.
    setOpen(false);
    if (n.incidentId) navigate(`/incidents/${n.incidentId}`);
    if (n.read) return;
    try {
      await api.notifications.read(n.id);
      await load();
    } catch (e) {
      useUiStore.getState().notify(errorMessage(e), "error");
    }
  }
  return (
    <div className="notifications" ref={root}>
      <Button
        variant="ghost"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="notification-count" data-testid="unread-count">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="notification-dropdown">
          <div className="section-heading">
            <strong>Notifications</strong>
            <Button
              variant="ghost"
              disabled={!unread}
              onClick={async () => {
                try {
                  await api.notifications.readAll();
                  await load();
                } catch (e) {
                  useUiStore.getState().notify(errorMessage(e), "error");
                }
              }}
            >
              Read all
            </Button>
          </div>
          {error && <p className="error">{error}</p>}
          {items.map((n) => (
            <button
              className={`notification-item ${n.read ? "" : "unread"}`}
              key={n.id}
              onClick={() => void select(n)}
            >
              <strong>{n.title}</strong>
              <span>{n.message}</span>
              <small>{date(n.createdAt)}</small>
            </button>
          ))}
          {!items.length && !error && <EmptyState message="No notifications" />}
          {hasMore && (
            <Button variant="ghost" onClick={() => void loadMore()}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
