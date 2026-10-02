CREATE TABLE audit_logs (
id uuid PRIMARY KEY, user_id uuid REFERENCES users(id), action varchar(255) NOT NULL,
entity_type varchar(255) NOT NULL, entity_id uuid, description text, created_at timestamptz NOT NULL
);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
