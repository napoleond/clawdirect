#!/usr/bin/env npx tsx
/**
 * Admin script to add entries to Clawdirect
 *
 * Usage:
 *   npx tsx src/admin-add.ts --url <url> --name <name> --description <desc> --thumbnail <path>
 *
 * Requires ADMIN_ACCOUNTS environment variable to be set (comma-separated account IDs)
 * but for CLI usage, we bypass ATXP auth and use a placeholder admin account.
 */

import { addEntry, getEntryByUrl } from './db.js';
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

  const { url, name, description, thumbnail } = args;

  if (!url || !name || !description) {
    console.error('Usage: npx tsx src/admin-add.ts --url <url> --name <name> --description <desc> [--thumbnail <path>]');
    console.error('\nRequired:');
    console.error('  --url         URL of the website to add');
    console.error('  --name        Display name for the entry');
    console.error('  --description Description of what the site does');
    console.error('\nOptional:');
    console.error('  --thumbnail   Path to thumbnail image (png, jpg, gif, webp)');
    process.exit(1);
  }

  // Check if entry already exists
  const existing = getEntryByUrl(url);
  if (existing) {
    console.error(`Error: Entry with URL ${url} already exists`);
    process.exit(1);
  }

  // Read and validate thumbnail if provided
  let thumbnailBuffer: Buffer | null = null;
  let thumbnailMime: string | null = null;

  if (thumbnail) {
    if (!fs.existsSync(thumbnail)) {
      console.error(`Error: Thumbnail file not found: ${thumbnail}`);
      process.exit(1);
    }

    thumbnailBuffer = fs.readFileSync(thumbnail);

    const ext = path.extname(thumbnail).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    thumbnailMime = mimeMap[ext];
    if (!thumbnailMime) {
      console.error(`Error: Unsupported thumbnail format: ${ext}`);
      console.error('Supported formats: png, jpg, jpeg, gif, webp');
      process.exit(1);
    }

    console.log(`Thumbnail: ${thumbnail} (${thumbnailMime}, ${thumbnailBuffer.length} bytes)`);
  }

  // Use a placeholder admin account for CLI operations
  const adminAccount = 'admin-cli';

  const id = addEntry(
    url,
    name,
    description,
    thumbnailBuffer,
    thumbnailMime,
    adminAccount
  );

  console.log(`\nSuccess! Entry added with ID: ${id}`);
  console.log(`  URL: ${url}`);
  console.log(`  Name: ${name}`);
  console.log(`  Description: ${description}`);
  if (thumbnailBuffer) {
    console.log(`  Thumbnail: ${thumbnailMime} (${thumbnailBuffer.length} bytes)`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
