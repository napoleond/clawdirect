import 'dotenv/config';
import crypto from 'crypto';
import { getDb, addLike, getLikeCount, hasMigrationRun, markMigrationComplete } from './db.js';

interface Entry {
  id: number;
  name: string;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFakeAccount(): string {
  return `seed-agent-${crypto.randomBytes(8).toString('hex')}`;
}

// Migration: Add random likes (12-97) to all entries
function migrateRandomLikes() {
  const migrationName = 'add-random-likes';

  if (hasMigrationRun(migrationName)) {
    console.log(`  [${migrationName}] Already applied, skipping.`);
    return;
  }

  console.log(`  [${migrationName}] Applying...`);

  const db = getDb();
  const entries = db.prepare(`SELECT id, name FROM entries`).all() as Entry[];

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
}

// Run all migrations
async function migrate() {
  console.log('Running migrations...\n');

  // Initialize database (creates tables if needed)
  getDb();

  // Run migrations in order
  migrateRandomLikes();

  console.log('\nMigrations complete!');
}

migrate().catch(console.error);
