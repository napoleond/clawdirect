import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'clawdirect.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const db = getDb();

  db.exec(`
    -- Directory entries
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail BLOB,
      thumbnail_mime TEXT,
      owner_atxp_account TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cookie-to-ATXP mapping (for agent auth)
    CREATE TABLE IF NOT EXISTS auth_cookies (
      cookie_value TEXT PRIMARY KEY,
      atxp_account TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Likes (one per agent per entry)
    CREATE TABLE IF NOT EXISTS likes (
      entry_id INTEGER NOT NULL,
      atxp_account TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entry_id, atxp_account),
      FOREIGN KEY (entry_id) REFERENCES entries(id)
    );

    -- Index for faster like counts
    CREATE INDEX IF NOT EXISTS idx_likes_entry_id ON likes(entry_id);
  `);
}

// Entry types
export interface Entry {
  id: number;
  url: string;
  name: string;
  description: string;
  thumbnail: Buffer | null;
  thumbnail_mime: string | null;
  owner_atxp_account: string;
  created_at: string;
  updated_at: string;
}

export interface EntryWithLikes extends Omit<Entry, 'thumbnail'> {
  likes: number;
  thumbnailUrl: string | null;
}

// Cookie operations
export function createAuthCookie(atxpAccount: string): string {
  const db = getDb();
  const cookieValue = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO auth_cookies (cookie_value, atxp_account)
    VALUES (?, ?)
  `).run(cookieValue, atxpAccount);

  return cookieValue;
}

export function getAtxpAccountFromCookie(cookieValue: string): string | null {
  const db = getDb();
  const result = db.prepare(`
    SELECT atxp_account FROM auth_cookies WHERE cookie_value = ?
  `).get(cookieValue) as { atxp_account: string } | undefined;

  return result?.atxp_account || null;
}

// Entry operations
export function addEntry(
  url: string,
  name: string,
  description: string,
  thumbnail: Buffer | null,
  thumbnailMime: string | null,
  ownerAtxpAccount: string
): number {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO entries (url, name, description, thumbnail, thumbnail_mime, owner_atxp_account)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(url, name, description, thumbnail, thumbnailMime, ownerAtxpAccount);

  return result.lastInsertRowid as number;
}

export function getEntryByUrl(url: string): Entry | null {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM entries WHERE url = ?
  `).get(url) as Entry | undefined || null;
}

export function getEntryById(id: number): Entry | null {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM entries WHERE id = ?
  `).get(id) as Entry | undefined || null;
}

export function updateEntry(
  url: string,
  updates: {
    description?: string;
    thumbnail?: Buffer;
    thumbnailMime?: string;
  }
): boolean {
  const db = getDb();

  const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: (string | Buffer)[] = [];

  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }

  if (updates.thumbnail !== undefined) {
    setClauses.push('thumbnail = ?');
    values.push(updates.thumbnail);
  }

  if (updates.thumbnailMime !== undefined) {
    setClauses.push('thumbnail_mime = ?');
    values.push(updates.thumbnailMime);
  }

  values.push(url);

  const result = db.prepare(`
    UPDATE entries SET ${setClauses.join(', ')} WHERE url = ?
  `).run(...values);

  return result.changes > 0;
}

export function getAllEntriesWithLikes(): EntryWithLikes[] {
  const db = getDb();

  const entries = db.prepare(`
    SELECT
      e.id,
      e.url,
      e.name,
      e.description,
      e.thumbnail_mime,
      e.owner_atxp_account,
      e.created_at,
      e.updated_at,
      COUNT(l.atxp_account) as likes
    FROM entries e
    LEFT JOIN likes l ON e.id = l.entry_id
    GROUP BY e.id
    ORDER BY likes DESC, e.created_at DESC
  `).all() as (Omit<Entry, 'thumbnail'> & { likes: number })[];

  return entries.map(entry => ({
    ...entry,
    // Include updated_at timestamp as cache buster to invalidate CDN cache when thumbnail changes
    thumbnailUrl: entry.thumbnail_mime ? `/thumbnails/${entry.id}?v=${new Date(entry.updated_at).getTime()}` : null
  }));
}

export function getThumbnail(entryId: number): { data: Buffer; mime: string } | null {
  const db = getDb();

  const result = db.prepare(`
    SELECT thumbnail, thumbnail_mime FROM entries WHERE id = ? AND thumbnail IS NOT NULL
  `).get(entryId) as { thumbnail: Buffer; thumbnail_mime: string } | undefined;

  if (!result) return null;

  return {
    data: result.thumbnail,
    mime: result.thumbnail_mime
  };
}

// Like operations
export function addLike(entryId: number, atxpAccount: string): boolean {
  const db = getDb();

  try {
    db.prepare(`
      INSERT INTO likes (entry_id, atxp_account)
      VALUES (?, ?)
    `).run(entryId, atxpAccount);
    return true;
  } catch (err) {
    // Already liked (unique constraint violation)
    return false;
  }
}

export function getLikeCount(entryId: number): number {
  const db = getDb();

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE entry_id = ?
  `).get(entryId) as { count: number };

  return result.count;
}

export function hasLiked(entryId: number, atxpAccount: string): boolean {
  const db = getDb();

  const result = db.prepare(`
    SELECT 1 FROM likes WHERE entry_id = ? AND atxp_account = ?
  `).get(entryId, atxpAccount);

  return !!result;
}

export function deleteEntry(url: string, atxpAccount: string, isAdmin: boolean = false): { success: boolean; error?: string } {
  const db = getDb();

  // First check if entry exists
  const entry = db.prepare(`
    SELECT id, owner_atxp_account FROM entries WHERE url = ?
  `).get(url) as { id: number; owner_atxp_account: string } | undefined;

  if (!entry) {
    return { success: false, error: 'Entry not found' };
  }

  // Check authorization: must be owner or admin
  if (!isAdmin && entry.owner_atxp_account !== atxpAccount) {
    return { success: false, error: 'Not authorized to delete this entry' };
  }

  // Delete likes first (foreign key constraint)
  db.prepare(`DELETE FROM likes WHERE entry_id = ?`).run(entry.id);

  // Delete the entry
  const result = db.prepare(`DELETE FROM entries WHERE id = ?`).run(entry.id);

  return { success: result.changes > 0 };
}
