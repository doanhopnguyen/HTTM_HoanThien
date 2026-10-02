CREATE TABLE refresh_tokens (
id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), token_hash varchar(255) UNIQUE NOT NULL,
expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL, device_name varchar(255)
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
