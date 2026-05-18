-- workspaces/api/migrations/0003_author_name.sql
-- Store display name at write time so reads never need a cross-DB user lookup.

ALTER TABLE threads ADD COLUMN author_name TEXT NOT NULL DEFAULT '';
ALTER TABLE posts   ADD COLUMN author_name TEXT NOT NULL DEFAULT '';
