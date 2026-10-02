CREATE TABLE incidents (
id uuid PRIMARY KEY, detection_event_id uuid UNIQUE NOT NULL REFERENCES detection_events(id),
status varchar(255) NOT NULL CHECK(status IN ('NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','FALSE_ALARM')),
handled_by uuid REFERENCES users(id), acknowledged_at timestamptz, started_at timestamptz, resolved_at timestamptz,
resolution_note text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX idx_incidents_status_time ON incidents(status,created_at DESC);
CREATE INDEX idx_incidents_handler ON incidents(handled_by);
