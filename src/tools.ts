import { defineTool } from '@longrun/turtle';
import { z } from 'zod';
import { requirePayment, atxpAccountId } from '@atxp/server';
import BigNumber from 'bignumber.js';
import {
  createAuthCookie,
  addEntry,
  getEntryByUrl,
  updateEntry,
  deleteEntry
} from './db.js';
import { ADD_ENTRY_COST, EDIT_ENTRY_COST, DELETE_ENTRY_COST, COOKIE_COST, ADMIN_ACCOUNTS } from './globals.js';

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
      instructions: 'To authenticate in a browser, navigate to https://claw.direct?clawdirect_cookie=<cookie_value> - the server will set the HTTP-only cookie and redirect to a clean URL. Alternatively, if your browser tool supports it, set the cookie directly with name "clawdirect_cookie".'
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

// Admin tool to add an entry without payment (admin only)
const AdminAddEntryParams = z.object({
  url: z.string().url().describe('The URL of the website to add'),
  name: z.string().min(1).max(100).describe('Display name for the entry'),
  description: z.string().min(1).max(500).describe('Description of what the site does'),
  thumbnail: z.string().optional().describe('Base64-encoded image data for the thumbnail'),
  thumbnailMime: z.string().optional().describe('MIME type of the thumbnail (e.g., image/png, image/jpeg)')
});

export const clawdirectAdminAddTool = defineTool(
  'clawdirect_admin_add',
  `[Admin only] Add a new entry to the Clawdirect directory without payment. Requires admin privileges. Cost: Free`,
  AdminAddEntryParams,
  async ({ url, name, description, thumbnail, thumbnailMime }) => {
    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    // Check if caller is admin
    if (!ADMIN_ACCOUNTS.includes(accountId)) {
      throw new Error('Admin privileges required');
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
    if (thumbnailMime) {
      const validMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validMimes.includes(thumbnailMime)) {
        throw new Error(`Invalid thumbnail MIME type. Must be one of: ${validMimes.join(', ')}`);
      }
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
      message: `Entry "${name}" added successfully to Clawdirect (admin)`
    });
  }
);

// Admin tool to edit an entry without payment or ownership check (admin only)
const AdminEditEntryParams = z.object({
  url: z.string().url().describe('The URL of the entry to edit'),
  description: z.string().min(1).max(500).optional().describe('New description'),
  thumbnail: z.string().optional().describe('New base64-encoded thumbnail'),
  thumbnailMime: z.string().optional().describe('New MIME type for thumbnail')
});

export const clawdirectAdminEditTool = defineTool(
  'clawdirect_admin_edit',
  `[Admin only] Edit any entry in Clawdirect without payment or ownership requirements. Requires admin privileges. Cost: Free`,
  AdminEditEntryParams,
  async ({ url, description, thumbnail, thumbnailMime }) => {
    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    // Check if caller is admin
    if (!ADMIN_ACCOUNTS.includes(accountId)) {
      throw new Error('Admin privileges required');
    }

    // Check if entry exists
    const entry = getEntryByUrl(url);
    if (!entry) {
      throw new Error(`Entry with URL ${url} not found`);
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
      message: `Entry "${entry.name}" updated successfully (admin)`
    });
  }
);

// Tool to delete an entry (owner or admin)
const DeleteEntryParams = z.object({
  url: z.string().url().describe('The URL of the entry to delete')
});

export const clawdirectDeleteTool = defineTool(
  'clawdirect_delete',
  `Delete an entry from the Clawdirect directory. You must be the owner of the entry or an admin to delete it. This action is irreversible. Cost: Free`,
  DeleteEntryParams,
  async ({ url }) => {
    if (DELETE_ENTRY_COST > 0) {
      await requirePayment({ price: new BigNumber(DELETE_ENTRY_COST) });
    }

    const accountId = atxpAccountId();
    if (!accountId) {
      throw new Error('Authentication required');
    }

    const isAdmin = ADMIN_ACCOUNTS.includes(accountId);
    const result = deleteEntry(url, accountId, isAdmin);

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete entry');
    }

    return JSON.stringify({
      success: true,
      message: `Entry with URL "${url}" deleted successfully`
    });
  }
);

export const allTools = [
  clawdirectCookieTool,
  clawdirectAddTool,
  clawdirectEditTool,
  clawdirectDeleteTool,
  clawdirectAdminAddTool,
  clawdirectAdminEditTool
];
