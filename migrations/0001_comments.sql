PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  github_id INTEGER PRIMARY KEY,
  login TEXT NOT NULL COLLATE NOCASE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (github_id) REFERENCES users(github_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_github_id_idx ON sessions(github_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT NOT NULL,
  github_id INTEGER NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
  status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (github_id) REFERENCES users(github_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comments_page_idx ON comments(page_path, status, created_at, id);
CREATE INDEX IF NOT EXISTS comments_author_time_idx ON comments(github_id, created_at);
