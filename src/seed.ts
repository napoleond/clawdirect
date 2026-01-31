import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb, addEntry, getEntryByUrl, updateEntry } from './db.js';

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
      // Update thumbnail if entry exists but has no thumbnail and we have one
      if (!existing.thumbnail && thumbnail && entry.thumbnailMime) {
        updateEntry(entry.url, {
          thumbnail,
          thumbnailMime: entry.thumbnailMime
        });
        console.log(`  Updated ${entry.name} with thumbnail`);
      } else {
        console.log(`  Skipping ${entry.name} - already exists`);
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
}

seed().catch(console.error);
