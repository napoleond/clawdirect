#!/usr/bin/env npx tsx
/**
 * Admin script to edit entries in Clawdirect
 *
 * Usage:
 *   npx tsx src/admin-edit.ts --url <url> [--name <name>] [--newUrl <newUrl>] [--description <desc>] [--thumbnail <path>]
 *
 * Requires DB_PATH environment variable to point to the database if not using local default.
 */

import { getEntryByUrl, updateEntry } from './db.js';
import fs from 'fs';
import path from 'path';

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { url, name, newUrl, description, thumbnail } = args;

  if (!url) {
    console.error('Usage: npx tsx src/admin-edit.ts --url <url> [--name <name>] [--newUrl <newUrl>] [--description <desc>] [--thumbnail <path>]');
    console.error('\nRequired:');
    console.error('  --url         URL of the entry to edit');
    console.error('\nOptional:');
    console.error('  --name        New display name');
    console.error('  --newUrl      New URL for the entry');
    console.error('  --description New description');
    console.error('  --thumbnail   Path to new thumbnail image (png, jpg, gif, webp)');
    process.exit(1);
  }

  // Check if entry exists
  const entry = getEntryByUrl(url);
  if (!entry) {
    console.error(`Error: Entry with URL ${url} not found`);
    process.exit(1);
  }

  console.log(`Found entry: ${entry.name} (ID: ${entry.id})`);

  // Prepare updates
  const updates: {
    name?: string;
    newUrl?: string;
    description?: string;
    thumbnail?: Buffer;
    thumbnailMime?: string;
  } = {};

  if (name) {
    updates.name = name;
    console.log(`  New name: ${name}`);
  }

  if (newUrl) {
    updates.newUrl = newUrl;
    console.log(`  New URL: ${newUrl}`);
  }

  if (description) {
    updates.description = description;
    console.log(`  New description: ${description}`);
  }

  if (thumbnail) {
    if (!fs.existsSync(thumbnail)) {
      console.error(`Error: Thumbnail file not found: ${thumbnail}`);
      process.exit(1);
    }

    updates.thumbnail = fs.readFileSync(thumbnail);

    const ext = path.extname(thumbnail).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const mime = mimeMap[ext];
    if (!mime) {
      console.error(`Error: Unsupported thumbnail format: ${ext}`);
      console.error('Supported formats: png, jpg, jpeg, gif, webp');
      process.exit(1);
    }

    updates.thumbnailMime = mime;
    console.log(`  New thumbnail: ${thumbnail} (${mime}, ${updates.thumbnail.length} bytes)`);
  }

  if (Object.keys(updates).length === 0) {
    console.error('Error: No updates specified. Use --description or --thumbnail');
    process.exit(1);
  }

  const success = updateEntry(url, updates);

  if (!success) {
    console.error('Error: Failed to update entry');
    process.exit(1);
  }

  console.log(`\nSuccess! Entry "${entry.name}" updated.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
