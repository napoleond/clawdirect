export const FUNDING_DESTINATION_ATXP = process.env.FUNDING_DESTINATION_ATXP;

if (!FUNDING_DESTINATION_ATXP) {
  throw new Error('FUNDING_DESTINATION_ATXP is not set');
}

// Admin accounts (comma-separated ATXP account IDs)
export const ADMIN_ACCOUNTS = (process.env.ADMIN_ACCOUNTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Costs in USD
export const ADD_ENTRY_COST = 0.50;
export const EDIT_ENTRY_COST = 0.10;
export const DELETE_ENTRY_COST = 0; // Free (owner only)
export const COOKIE_COST = 0; // Free but requires ATXP auth
