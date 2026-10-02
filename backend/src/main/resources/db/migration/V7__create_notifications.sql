CREATE TABLE notifications (
id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), incident_id uuid REFERENCES incidents(id),
type varchar(255) NOT NULL, title varchar(255) NOT NULL, message text NOT NULL, is_read boolean NOT NULL DEFAULT false,
read_at timestamptz, created_at timestamptz NOT NULL
);
CREATE INDEX idx_notifications_user_time ON notifications(user_id,created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read=false;
