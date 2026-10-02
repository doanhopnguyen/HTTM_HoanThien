CREATE TABLE incident_history (
id uuid PRIMARY KEY, incident_id uuid NOT NULL REFERENCES incidents(id), action varchar(255) NOT NULL,
from_status varchar(255), to_status varchar(255), performed_by uuid REFERENCES users(id), note text, created_at timestamptz NOT NULL
);
CREATE INDEX idx_history_incident_time ON incident_history(incident_id,created_at);
