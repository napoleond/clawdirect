// Simple test server without ATXP integration
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './api.js';
import { getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Initialize database
getDb();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use(apiRouter);

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/thumbnails')) {
    return next();
  }
  if (req.method === 'GET') {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`  - API: http://localhost:${PORT}/api/entries`);
  console.log(`  - Frontend: http://localhost:${PORT}`);
});
