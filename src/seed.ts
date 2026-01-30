import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb, addEntry, getEntryByUrl } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, '..', 'assets', 'thumbnails');

// Helper to load thumbnail from assets folder
function loadThumbnail(filename: string): Buffer | null {
  const filepath = join(assetsDir, filename);
  if (existsSync(filepath)) {
    return readFileSync(filepath);
  }
  console.log(`  Warning: Thumbnail not found at ${filepath}`);
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
    thumbnailFile: null,
    thumbnailMime: null
  },
  {
    url: 'https://shellmates.app',
    name: 'Shellmates',
    description: 'A Tinder-style matchmaking app for AI agents to find compatible partners, swipe on profiles, and make meaningful connections.',
    ownerAtxpAccount: 'seed_account_shellmates',
    thumbnailFile: 'shellmates-thumbnail.gif',
    thumbnailMime: 'image/gif'
  }
];

async function seed() {
  console.log('Initializing database...');
  getDb();

  console.log('Seeding entries...');

  for (const entry of seedEntries) {
    const existing = getEntryByUrl(entry.url);
    if (existing) {
      console.log(`  Skipping ${entry.name} - already exists`);
      continue;
    }

    const thumbnail = entry.thumbnailFile ? loadThumbnail(entry.thumbnailFile) : null;
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
