import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { errorMessage, type Notification } from "@pool-safety/shared";
import { useNotificationStore } from "../../stores/notificationStore";
import { useUiStore } from "../../stores/uiStore";
import { Button, EmptyState } from "../../components/ui";
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, load, error } = useNotificationStore();
  const navigate = useNavigate();
  async function select(n: Notification) {
    try {
      await api.notifications.read(n.id);
      await load();
      if (n.incidentId) navigate(`/incidents/${n.incidentId}`);
      setOpen(false);
    } catch (e) {
      useUiStore.getState().notify(errorMessage(e));
    }
  }
  return (
    <div className="notifications">
      <Button
        variant="ghost"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </Button>
      {open && (
        <div className="notification-dropdown">
          <div className="section-heading">
            <strong>Notifications</strong>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await api.notifications.readAll();
                  await load();
                } catch (e) {
                  useUiStore.getState().notify(errorMessage(e));
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
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </button>
          ))}
          {!items.length && !error && <EmptyState message="No notifications" />}
        </div>
      )}
    </div>
  );
}
