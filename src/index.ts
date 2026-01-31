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
