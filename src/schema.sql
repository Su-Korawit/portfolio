CREATE TABLE IF NOT EXISTS series (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- series_id, series_part and sort_order came after the first release; src/db.js adds them to an older
-- database that already has this table.
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY,
  cover_image  TEXT,
  series_id    INTEGER REFERENCES series(id) ON DELETE SET NULL,
  series_part  INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS post_translations (
  post_id          INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lang             TEXT NOT NULL CHECK (lang IN ('th', 'en')),
  status           TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL DEFAULT '',
  body_markdown    TEXT NOT NULL DEFAULT '',
  cover_image_alt  TEXT NOT NULL DEFAULT '',
  seo_title        TEXT NOT NULL DEFAULT '',
  seo_description  TEXT NOT NULL DEFAULT '',
  published_at     TEXT,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (post_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY,
  thumbnail   TEXT,
  repo_url    TEXT,
  demo_url    TEXT,
  featured    INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS project_translations (
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lang           TEXT NOT NULL CHECK (lang IN ('th', 'en')),
  status         TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  summary        TEXT NOT NULL DEFAULT '',
  body_markdown  TEXT NOT NULL DEFAULT '',
  thumbnail_alt  TEXT NOT NULL DEFAULT '',
  published_at   TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (project_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE IF NOT EXISTS tags (
  id       INTEGER PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name_th  TEXT NOT NULL,
  name_en  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT NOT NULL,
  lang   TEXT NOT NULL CHECK (lang IN ('th', 'en', '*')),
  value  TEXT NOT NULL,
  PRIMARY KEY (key, lang)
);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY,
  post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NULL) <> (project_id IS NULL))
);
CREATE INDEX IF NOT EXISTS comments_post ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_project ON comments (project_id, created_at);
