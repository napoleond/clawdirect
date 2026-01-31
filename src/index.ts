import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { startHttpServer } from '@longrun/turtle';
import { atxpExpress } from '@atxp/express';
import { ATXPAccount } from '@atxp/common';
import { RedisOAuthDb } from '@atxp/redis';
import { allTools } from './tools.js';
import { apiRouter } from './api.js';
import { FUNDING_DESTINATION_ATXP, PORT } from './globals.js';
import { getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function run(port: number) {
  // Initialize database
  getDb();

  let oAuthDb: RedisOAuthDb | undefined = undefined;
  if (process.env.OAUTH_DB_REDIS_URL) {
    oAuthDb = new RedisOAuthDb({
      redis: process.env.OAUTH_DB_REDIS_URL,
      keyPrefix: `atxp:oauth:clawdirect:${process.env.NODE_ENV || 'development'}:`
    });
  }

  // Create Express app for additional routes
  const app = express();
  app.use(cors());
  app.use(express.json());

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

  // API routes
  app.use(apiRouter);

  // Serve static frontend files in production
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for all non-API routes (Express 5 syntax)
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

  // Start the Turtle MCP server with Express middleware
  startHttpServer(
    port,
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
      }),
      app
    ]
  );

  console.log(`Clawdirect server running on port ${port}`);
  console.log(`  - MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`  - API endpoint: http://localhost:${port}/api`);
  console.log(`  - Frontend: http://localhost:${port}`);
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1] ||
    new URL(import.meta.url).href.includes(process.argv[1])
  : false;

if (isDirectRun) {
  run(PORT);
}
