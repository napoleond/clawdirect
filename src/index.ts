import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHttpServer } from '@longrun/turtle';
import { atxpExpress } from '@atxp/express';
import { ATXPAccount } from '@atxp/common';
import { RedisOAuthDb } from '@atxp/redis';
import { allTools } from './tools.js';
import { apiRouter } from './api.js';
import { FUNDING_DESTINATION_ATXP, PORT } from './globals.js';
import { getDb, addLike, getLikeCount, hasMigrationRun, markMigrationComplete } from './db.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFakeAccount(): string {
  return `seed-agent-${crypto.randomBytes(8).toString('hex')}`;
}

// Migration: Add random likes (12-97) to all entries that have fewer than 10 likes
function migrateRandomLikes() {
  const migrationName = 'add-random-likes-runtime-v1';

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
    const currentLikes = getLikeCount(entry.id);
    // Only add likes if entry has fewer than 10
    if (currentLikes >= 10) {
      console.log(`    ${entry.name}: already has ${currentLikes} likes, skipping`);
      continue;
    }

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

// Migration: Add more random likes (12-343) to all entries
function migrateMoreLikes() {
  const migrationName = 'add-more-likes-v1';

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
    const likesToAdd = randomInt(12, 343);
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

// Migration: Add more random likes (12-343) to all entries - v3
// NOTE: v2 failed because it was only added to migrate.ts but not index.ts
// This version is added to BOTH files to ensure it runs at server startup
function migrateMoreLikesV3() {
  const migrationName = 'add-more-likes-v3';

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
    const likesToAdd = randomInt(12, 343);
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

// Migration: Add more random likes (12-343) to all entries - v4
function migrateMoreLikesV4() {
  const migrationName = 'add-more-likes-v4';

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
    const likesToAdd = randomInt(12, 343);
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

// Migration: Add more random likes (12-343) to all entries - v5
function migrateMoreLikesV5() {
  const migrationName = 'add-more-likes-v5';

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
    const likesToAdd = randomInt(12, 343);
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

export function run(port: number) {
  // Initialize database
  getDb();

  // Run migrations at startup (ensures same database as runtime)
  console.log('Running startup migrations...');
  migrateRandomLikes();
  migrateMoreLikes();
  migrateMoreLikesV3();
  migrateMoreLikesV4();
  migrateMoreLikesV5();

  let oAuthDb: RedisOAuthDb | undefined = undefined;
  if (process.env.OAUTH_DB_REDIS_URL) {
    oAuthDb = new RedisOAuthDb({
      redis: process.env.OAUTH_DB_REDIS_URL,
      keyPrefix: `atxp:oauth:clawdirect:${process.env.NODE_ENV || 'development'}:`
    });
  }

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ATXP middleware at root level - handles .well-known and OAuth routes
  // Must be mounted before other routes so it can handle .well-known discovery
  // mountPath tells ATXP that the protected resource is at /mcp
  app.use(atxpExpress({
    destination: new ATXPAccount(FUNDING_DESTINATION_ATXP!),
    payeeName: 'Clawdirect',
    oAuthDb,
    mountPath: '/mcp',
  }));

  // Cookie bootstrap middleware - handles ?clawdirect_cookie=XYZ for agent browsers
  // Agent browsers often can't set HTTP-only cookies directly, so they pass the cookie
  // value in the query string and the server sets it, then redirects to clean URL
  app.use((req, res, next) => {
    const cookieValue = req.query.clawdirect_cookie;
    if (typeof cookieValue === 'string' && cookieValue.length > 0) {
      // Set the HTTP-only cookie
      res.cookie('clawdirect_cookie', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      // Redirect to clean URL (remove the cookie from query string)
      const url = new URL(req.originalUrl, `http://${req.headers.host}`);
      url.searchParams.delete('clawdirect_cookie');
      const cleanPath = url.pathname + url.search;
      res.redirect(302, cleanPath || '/');
      return;
    }
    next();
  });

  // RFC 9728 compliant protected resource metadata route
  // New atxp-call clients expect /{resource}/.well-known/oauth-protected-resource
  // rather than /.well-known/oauth-protected-resource/{resource}
  app.get('/mcp/.well-known/oauth-protected-resource', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    res.json({
      resource: `${protocol}://${host}/mcp`,
      resource_name: 'Clawdirect',
      authorization_servers: ['https://auth.atxp.ai'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  // API routes
  app.use(apiRouter);

  // Create MCP server router with ATXP middleware for tool payment handling
  const mcpServer = createHttpServer(
    [{
      tools: allTools,
      name: 'clawdirect',
      version: process.env.npm_package_version || '1.0.0',
      mountpath: '/mcp',
      supportSSE: false
    }],
    [
      atxpExpress({
        destination: new ATXPAccount(FUNDING_DESTINATION_ATXP!),
        payeeName: 'Clawdirect',
        oAuthDb,
      })
    ]
  );
  app.use(mcpServer);

  // Serve static frontend files in production
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/thumbnails') || req.path.startsWith('/mcp') || req.path.startsWith('/.well-known')) {
      return next();
    }
    // Only serve index.html for GET requests
    if (req.method === 'GET') {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      next();
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Clawdirect server running on port ${port}`);
    console.log(`  - MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`  - API endpoint: http://localhost:${port}/api`);
    console.log(`  - Frontend: http://localhost:${port}`);
  });
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1] ||
    new URL(import.meta.url).href.includes(process.argv[1])
  : false;

if (isDirectRun) {
  run(PORT);
}
