-- workspaces/api/migrations/0002_seed_categories.sql
-- Fixed categories — defined once, never user-configurable.

INSERT INTO categories (id, slug, label, sort_order) VALUES
  ('cat_road',    'road-maintenance', 'Road & Maintenance', 1),
  ('cat_events',  'events',           'Events',             2),
  ('cat_snow',    'snow-removal',     'Snow Removal',       3),
  ('cat_general', 'general',          'General',            4);
