-- workspaces/auth/migrations/0001_better_auth.sql
-- Better Auth identity tables owned exclusively by the auth worker.
-- Column names match Better Auth's camelCase field names exactly.
-- The `active` column extends the user table for account deactivation.

CREATE TABLE IF NOT EXISTS "user" (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image         TEXT,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS session (
  id             TEXT PRIMARY KEY,
  expiresAt      TEXT NOT NULL,
  token          TEXT NOT NULL UNIQUE,
  createdAt      TEXT NOT NULL,
  updatedAt      TEXT NOT NULL,
  ipAddress      TEXT,
  userAgent      TEXT,
  userId         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id                    TEXT PRIMARY KEY,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  userId                TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken           TEXT,
  refreshToken          TEXT,
  idToken               TEXT,
  accessTokenExpiresAt  TEXT,
  refreshTokenExpiresAt TEXT,
  scope                 TEXT,
  password              TEXT,
  createdAt             TEXT NOT NULL,
  updatedAt             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  createdAt  TEXT,
  updatedAt  TEXT
);
