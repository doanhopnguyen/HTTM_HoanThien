CREATE TABLE detection_events (
id uuid PRIMARY KEY, camera_id uuid NOT NULL REFERENCES cameras(id), event_type varchar(80) NOT NULL,
confidence numeric(6,5) CHECK(confidence BETWEEN 0 AND 1), snapshot_url varchar(2048), video_url varchar(2048),
metadata jsonb, detected_at timestamptz NOT NULL, created_at timestamptz NOT NULL
);
CREATE INDEX idx_detection_camera_time ON detection_events(camera_id,detected_at DESC);
