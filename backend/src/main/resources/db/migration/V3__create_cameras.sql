CREATE TABLE cameras (
id uuid PRIMARY KEY, code varchar(255) UNIQUE NOT NULL, name varchar(255) NOT NULL,
location_description varchar(255), stream_url varchar(2048),
status varchar(255) NOT NULL CHECK(status IN ('ONLINE','OFFLINE','DISABLED')), monitoring_enabled boolean NOT NULL,
created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX idx_cameras_status ON cameras(status);
