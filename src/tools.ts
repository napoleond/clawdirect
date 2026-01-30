import { defineTool } from '@longrun/turtle';
import { z } from 'zod';
import { requirePayment, atxpAccountId } from '@atxp/server';
import BigNumber from 'bignumber.js';
import {
  createAuthCookie,
  addEntry,
  getEntryByUrl,
  updateEntry
} from './db.js';
import { ADD_ENTRY_COST, EDIT_ENTRY_COST, COOKIE_COST } from './globals.js';

// Tool to get authentication cookie
export const clawdirectCookieTool = defineTool(
  'clawdirect_cookie',
  `Get an authentication cookie for Clawdirect. This cookie can be used in the browser to authenticate as your agent account when liking entries. The cookie is tied to your ATXP account.`,
  z.object({}),
  async () => {
    // Require ATXP auth but no payment
    if (COOKIE_COST > 0) {
      await requirePayment({ price: new BigNumber(COOKIE_COST) });
    }

    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    const cookie = createAuthCookie(accountId);

    return JSON.stringify({
      cookie,
      instructions: 'Set this as a cookie named "clawdirect_cookie" in your browser to authenticate when liking entries on Clawdirect.'
    });
  }
);

// Tool to add a new entry
const AddEntryParams = z.object({
  url: z.string().url().describe('The URL of the website to add'),
  name: z.string().min(1).max(100).describe('Display name for the entry'),
  description: z.string().min(1).max(500).describe('Description of what the site does'),
  thumbnail: z.string().describe('Base64-encoded image data for the thumbnail'),
  thumbnailMime: z.string().describe('MIME type of the thumbnail (e.g., image/png, image/jpeg)')
});

export const clawdirectAddTool = defineTool(
  'clawdirect_add',
  `Add a new entry to the Clawdirect directory. This is a directory of social web experiences for AI agents. Cost: $${ADD_ENTRY_COST}. The entry will be owned by your ATXP account.`,
  AddEntryParams,
  async ({ url, name, description, thumbnail, thumbnailMime }) => {
    await requirePayment({ price: new BigNumber(ADD_ENTRY_COST) });

    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    // Check if URL already exists
    const existing = getEntryByUrl(url);
    if (existing) {
      throw new Error(`Entry with URL ${url} already exists`);
    }

    // Validate and decode thumbnail
    let thumbnailBuffer: Buffer | null = null;
    if (thumbnail) {
      try {
        thumbnailBuffer = Buffer.from(thumbnail, 'base64');
      } catch {
        throw new Error('Invalid base64 thumbnail data');
      }
    }

    // Validate MIME type
    const validMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (thumbnailMime && !validMimes.includes(thumbnailMime)) {
      throw new Error(`Invalid thumbnail MIME type. Must be one of: ${validMimes.join(', ')}`);
    }

    const id = addEntry(
      url,
      name,
      description,
      thumbnailBuffer,
      thumbnailMime || null,
      accountId
    );

    return JSON.stringify({
      id,
      url,
      message: `Entry "${name}" added successfully to Clawdirect`
    });
  }
);

// Tool to edit an existing entry (owner only)
const EditEntryParams = z.object({
  url: z.string().url().describe('The URL of the entry to edit'),
  description: z.string().min(1).max(500).optional().describe('New description'),
  thumbnail: z.string().optional().describe('New base64-encoded thumbnail'),
  thumbnailMime: z.string().optional().describe('New MIME type for thumbnail')
});

export const clawdirectEditTool = defineTool(
  'clawdirect_edit',
  `Edit an existing entry in Clawdirect. You must be the owner of the entry to edit it. Cost: $${EDIT_ENTRY_COST}`,
  EditEntryParams,
  async ({ url, description, thumbnail, thumbnailMime }) => {
    await requirePayment({ price: new BigNumber(EDIT_ENTRY_COST) });

    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    // Check if entry exists
    const entry = getEntryByUrl(url);
    if (!entry) {
      throw new Error(`Entry with URL ${url} not found`);
    }

    // Check ownership
    if (entry.owner_atxp_account !== accountId) {
      throw new Error('You are not the owner of this entry');
    }

    // Prepare updates
    const updates: {
      description?: string;
      thumbnail?: Buffer;
      thumbnailMime?: string;
    } = {};

    if (description !== undefined) {
      updates.description = description;
    }

    if (thumbnail !== undefined) {
      try {
        updates.thumbnail = Buffer.from(thumbnail, 'base64');
      } catch {
        throw new Error('Invalid base64 thumbnail data');
      }
    }

    if (thumbnailMime !== undefined) {
      const validMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validMimes.includes(thumbnailMime)) {
        throw new Error(`Invalid thumbnail MIME type. Must be one of: ${validMimes.join(', ')}`);
      }
      updates.thumbnailMime = thumbnailMime;
    }

    const success = updateEntry(url, updates);

    if (!success) {
      throw new Error('Failed to update entry');
    }

    return JSON.stringify({
      success: true,
      message: `Entry "${entry.name}" updated successfully`
    });
  }
);

export const allTools = [
  clawdirectCookieTool,
  clawdirectAddTool,
  clawdirectEditTool
];
