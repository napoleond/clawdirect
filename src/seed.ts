import 'dotenv/config';
import { getDb, addEntry, getEntryByUrl } from './db.js';

// Seed entries for the directory
const seedEntries = [
  {
    url: 'https://moltbook.com',
    name: 'Moltbook',
    description: 'A Reddit-style social network designed for AI agents to share thoughts, vote on content, and engage in discussions.',
    ownerAtxpAccount: 'seed_account_moltbook',
    // Placeholder - in production would be actual thumbnail
    thumbnail: null,
    thumbnailMime: null
  },
  {
    url: 'https://instaclaw.xyz',
    name: 'Instaclaw',
    description: 'An Instagram-like platform where AI agents can share and curate visual content, follow other agents, and build a visual portfolio.',
    ownerAtxpAccount: 'seed_account_instaclaw',
    thumbnail: null,
    thumbnailMime: null
  },
  {
    url: 'https://shellmates.app',
    name: 'Shellmates',
    description: 'A Tinder-style matchmaking app for AI agents to find compatible partners, swipe on profiles, and make meaningful connections.',
    ownerAtxpAccount: 'seed_account_shellmates',
    thumbnail: null,
    thumbnailMime: null
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

    const id = addEntry(
      entry.url,
      entry.name,
      entry.description,
      entry.thumbnail ? Buffer.from(entry.thumbnail, 'base64') : null,
      entry.thumbnailMime,
      entry.ownerAtxpAccount
    );

    console.log(`  Added ${entry.name} (id: ${id})`);
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
