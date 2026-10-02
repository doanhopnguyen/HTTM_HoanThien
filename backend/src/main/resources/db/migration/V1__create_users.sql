CREATE TABLE users (
id uuid PRIMARY KEY, username varchar(100) UNIQUE NOT NULL, email varchar(255) UNIQUE NOT NULL,
password_hash varchar(255) NOT NULL, full_name varchar(150) NOT NULL,
role varchar(30) NOT NULL CHECK(role IN ('ADMIN','STAFF')),
status varchar(30) NOT NULL CHECK(status IN ('ACTIVE','DISABLED')),
auth_version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX idx_users_status ON users(status);
