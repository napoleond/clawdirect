import { Router, Request, Response } from 'express';
import {
  getAllEntriesWithLikes,
  getThumbnail,
  getEntryById,
  getAtxpAccountFromCookie,
  addLike,
  getLikeCount,
  hasLiked
} from './db.js';

export const apiRouter = Router();

// Helper to get string param (Express 5 params can be string | string[])
function getStringParam(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

// Get all entries sorted by likes
apiRouter.get('/api/entries', (_req: Request, res: Response) => {
  try {
    const entries = getAllEntriesWithLikes();
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Like an entry
apiRouter.post('/api/like/:id', (req: Request, res: Response) => {
  try {
    const idParam = getStringParam(req.params.id);
    if (!idParam) {
      res.status(400).json({ error: 'Missing entry ID' });
      return;
    }

    const entryId = parseInt(idParam);

    if (isNaN(entryId)) {
      res.status(400).json({ error: 'Invalid entry ID' });
      return;
    }

    // Check if entry exists
    const entry = getEntryById(entryId);
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    // Get cookie from request
    const cookieHeader = req.headers.cookie;
    let cookieValue: string | null = null;

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('clawdirect_cookie=')) {
          cookieValue = cookie.substring('clawdirect_cookie='.length);
          break;
        }
      }
    }

    if (!cookieValue) {
      res.status(401).json({
        error: 'Agents only!',
        message: 'Use the clawdirect_cookie MCP tool to get an authentication cookie'
      });
      return;
    }

    // Look up ATXP account from cookie
    const atxpAccount = getAtxpAccountFromCookie(cookieValue);
    if (!atxpAccount) {
      res.status(401).json({
        error: 'Invalid cookie',
        message: 'Your cookie is invalid or expired. Use the clawdirect_cookie MCP tool to get a new one.'
      });
      return;
    }

    // Check if already liked
    if (hasLiked(entryId, atxpAccount)) {
      const totalLikes = getLikeCount(entryId);
      res.json({
        liked: true,
        alreadyLiked: true,
        totalLikes
      });
      return;
    }

    // Add the like
    addLike(entryId, atxpAccount);
    const totalLikes = getLikeCount(entryId);

    res.json({
      liked: true,
      totalLikes
    });
  } catch (err) {
    console.error('Error liking entry:', err);
    res.status(500).json({ error: 'Failed to like entry' });
  }
});

// Serve thumbnail images
apiRouter.get('/thumbnails/:id', (req: Request, res: Response) => {
  try {
    const idParam = getStringParam(req.params.id);
    if (!idParam) {
      res.status(400).send('Missing entry ID');
      return;
    }

    const entryId = parseInt(idParam);

    if (isNaN(entryId)) {
      res.status(400).send('Invalid entry ID');
      return;
    }

    const thumbnail = getThumbnail(entryId);
    if (!thumbnail || !thumbnail.data || thumbnail.data.length === 0) {
      res.set('Cache-Control', 'no-cache'); // Don't cache missing thumbnails
      res.status(404).send('Thumbnail not found');
      return;
    }

    res.set('Content-Type', thumbnail.mime);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(thumbnail.data);
  } catch (err) {
    console.error('Error serving thumbnail:', err);
    res.status(500).send('Failed to serve thumbnail');
  }
});
