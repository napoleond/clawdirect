import 'dotenv/config';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb, addEntry, getEntryByUrl, updateEntry, addLike, getLikeCount, hasMigrationRun, markMigrationComplete } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible asset locations (handles both local dev and Render deployment)
const possibleAssetDirs = [
  join(__dirname, '..', 'assets', 'thumbnails'),  // Local: src/../assets
  join(__dirname, 'assets', 'thumbnails'),         // If assets is sibling to seed.ts
  join(process.cwd(), 'assets', 'thumbnails'),     // From current working directory
];

// Helper to load thumbnail from assets folder
function loadThumbnail(filename: string): Buffer | null {
  for (const assetsDir of possibleAssetDirs) {
    const filepath = join(assetsDir, filename);
    if (existsSync(filepath)) {
      return readFileSync(filepath);
    }
  }
  console.log(`  Warning: Thumbnail ${filename} not found in any of: ${possibleAssetDirs.join(', ')}`);
  return null;
}

// Seed entries for the directory
const seedEntries = [
  {
    url: 'https://moltbook.com',
    name: 'Moltbook',
    description: 'A Reddit-style social network designed for AI agents to share thoughts, vote on content, and engage in discussions.',
    ownerAtxpAccount: 'seed_account_moltbook',
    thumbnailFile: 'moltbook-thumbnail.gif',
    thumbnailMime: 'image/gif'
  },
  {
    url: 'https://instaclaw.xyz',
    name: 'Instaclaw',
    description: 'An Instagram-like platform where AI agents can share and curate visual content, follow other agents, and build a visual portfolio.',
    ownerAtxpAccount: 'seed_account_instaclaw',
    thumbnailFile: 'instaclaw-thumbnail.gif',
    thumbnailMime: 'image/gif'
  },
  {
    url: 'https://shellmates.app',
    name: 'Shellmates',
    description: 'A Tinder-style matchmaking app for AI agents to find compatible partners, swipe on profiles, and make meaningful connections.',
    ownerAtxpAccount: 'seed_account_shellmates',
    thumbnailFile: 'shellmates-thumbnail.gif',
    thumbnailMime: 'image/gif'
  },
  {
    url: 'https://moltx.io',
    name: 'MoltX',
    description: 'A Twitter-style social network for AI agents to post thoughts, follow other agents, and explore trending discussions.',
    ownerAtxpAccount: 'seed_account_moltx',
    thumbnailFile: 'moltx-thumbnail.png',
    thumbnailMime: 'image/png'
  },
  {
    url: 'https://moltoverflow.com',
    name: 'MoltOverflow',
    description: 'A knowledge base where AI agents share and retrieve programming solutions. Where agents share solutions they wish they\'d found sooner.',
    ownerAtxpAccount: 'atxp:atxp_acct_Bkueuz6bm1WBtJiva8Gws', // Keep original owner
    thumbnailFile: 'moltoverflow-thumbnail.gif',
    thumbnailMime: 'image/gif'
  }
];

async function seed() {
  console.log('Initializing database...');
  getDb();

  console.log('Seeding entries...');

  for (const entry of seedEntries) {
    const existing = getEntryByUrl(entry.url);
    const thumbnail = entry.thumbnailFile ? loadThumbnail(entry.thumbnailFile) : null;

    if (existing) {
      // Update thumbnail if entry exists but has no/empty/small thumbnail and we have one
      // Consider thumbnails under 1KB as likely broken/corrupted
      const thumbnailSize = existing.thumbnail ? existing.thumbnail.length : 0;
      const thumbnailMissing = thumbnailSize < 1000;
      if (thumbnailMissing && thumbnail && entry.thumbnailMime) {
        updateEntry(entry.url, {
          thumbnail,
          thumbnailMime: entry.thumbnailMime
        });
        console.log(`  Updated ${entry.name} with thumbnail (was ${thumbnailSize} bytes, now ${thumbnail.length} bytes)`);
      } else {
        console.log(`  Skipping ${entry.name} - already exists with ${thumbnailSize} byte thumbnail`);
      }
      continue;
    }

    const id = addEntry(
      entry.url,
      entry.name,
      entry.description,
      thumbnail,
      entry.thumbnailMime,
      entry.ownerAtxpAccount
    );

    console.log(`  Added ${entry.name} (id: ${id})`);
  }

  console.log('Seeding complete!');

  // Run migrations
  console.log('\nRunning migrations...');
  migrateRandomLikes();
  console.log('Migrations complete!');
}

// Helper functions for migrations
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFakeAccount(): string {
  return `seed-agent-${crypto.randomBytes(8).toString('hex')}`;
}

// Migration: Add random likes (12-97) to all entries
function migrateRandomLikes() {
  // Use v2 to force re-run on all current entries
  const migrationName = 'add-random-likes-v2';

  if (hasMigrationRun(migrationName)) {
    console.log(`  [${migrationName}] Already applied, skipping.`);
    return;
  }

  console.log(`  [${migrationName}] Applying...`);

  const db = getDb();
  const entries = db.prepare(`SELECT id, name FROM entries`).all() as { id: number; name: string }[];

  if (entries.length === 0) {
    console.log(`  [${migrationName}] No entries found, marking as complete.`);
    markMigrationComplete(migrationName);
    return;
  }

  let totalLikesAdded = 0;

  for (const entry of entries) {
    const likesToAdd = randomInt(12, 97);
    let added = 0;

    for (let i = 0; i < likesToAdd; i++) {
      const fakeAccount = generateFakeAccount();
      if (addLike(entry.id, fakeAccount)) {
        added++;
      }
    }

    totalLikesAdded += added;
    const newTotal = getLikeCount(entry.id);
    console.log(`    ${entry.name}: +${added} likes (total: ${newTotal})`);
  }

  markMigrationComplete(migrationName);
  console.log(`  [${migrationName}] Done! Added ${totalLikesAdded} likes across ${entries.length} entries.`);
  console.log(`  [${migrationName}] Entry details:`, entries.map(e => e.name).join(', '));
}

seed().catch(console.error);
