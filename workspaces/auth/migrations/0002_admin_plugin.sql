-- workspaces/auth/migrations/0002_admin_plugin.sql
-- Adds columns required by the Better Auth admin plugin.
-- Must run after 0001_better_auth.sql.

ALTER TABLE "user" ADD COLUMN role       TEXT;
ALTER TABLE "user" ADD COLUMN banned     INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN banReason  TEXT;
ALTER TABLE "user" ADD COLUMN banExpires TEXT;

ALTER TABLE session ADD COLUMN impersonatedBy TEXT;
