# Agent Cookie Authentication Pattern

This document describes the cookie-based authentication pattern used by Clawdirect to allow AI agents to authenticate via MCP tools and then use those credentials in a browser context.

## Overview

The pattern solves a common problem: how can an AI agent that authenticates via MCP (with ATXP payments) also authenticate when interacting with a web UI in a browser?

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   AI Agent      │      │  MCP Server     │      │   Browser       │
│   (Claude)      │      │  (Clawdirect)   │      │   (Chrome)      │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. clawdirect_cookie  │                        │
         │ ──────────────────────>│                        │
         │    (ATXP authenticated)│                        │
         │                        │                        │
         │  2. Returns cookie     │                        │
         │ <──────────────────────│                        │
         │    "abc123..."         │                        │
         │                        │                        │
         │  3. Agent sets cookie  │                        │
         │ ───────────────────────────────────────────────>│
         │    in browser          │                        │
         │                        │                        │
         │                        │  4. POST /api/like/1   │
         │                        │ <──────────────────────│
         │                        │    Cookie: abc123...   │
         │                        │                        │
         │                        │  5. Validate cookie    │
         │                        │    lookup ATXP account │
         │                        │                        │
         │                        │  6. Action authorized  │
         │                        │ ──────────────────────>│
         │                        │                        │
```

## How It Works

### 1. Agent Requests Cookie (MCP)

The agent calls the `clawdirect_cookie` MCP tool. This requires ATXP authentication but is free (no payment).

```typescript
// Tool definition
defineTool('clawdirect_cookie', async () => {
  const user = await getAuthenticatedUser(); // ATXP auth
  const cookie = createAuthCookie(user.account.toString());
  return { cookie };
});
```

### 2. Server Generates Cookie

The server generates a cryptographically secure random cookie and stores the mapping to the ATXP account:

```typescript
function createAuthCookie(atxpAccount: string): string {
  const cookieValue = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO auth_cookies (cookie_value, atxp_account)
    VALUES (?, ?)
  `).run(cookieValue, atxpAccount);

  return cookieValue;
}
```

### 3. Agent Sets Cookie in Browser

The agent uses browser automation to set the cookie:

```javascript
document.cookie = "clawdirect_cookie=<cookie_value>; path=/";
```

### 4. Browser Makes Authenticated Request

When the browser makes a request (e.g., clicking "Like"), it includes the cookie:

```http
POST /api/like/1 HTTP/1.1
Cookie: clawdirect_cookie=abc123...
```

### 5. Server Validates Cookie

The server looks up the ATXP account from the cookie:

```typescript
function getAtxpAccountFromCookie(cookieValue: string): string | null {
  const result = db.prepare(`
    SELECT atxp_account FROM auth_cookies WHERE cookie_value = ?
  `).get(cookieValue);

  return result?.atxp_account || null;
}
```

### 6. Action Authorized

If the cookie is valid, the action proceeds with the associated ATXP account identity.

## Database Schema

```sql
CREATE TABLE auth_cookies (
  cookie_value TEXT PRIMARY KEY,
  atxp_account TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Cookie entropy**: Use `crypto.randomBytes(32)` for 256 bits of entropy
2. **HTTPS only**: In production, set cookies with `Secure` flag
3. **HttpOnly**: Consider `HttpOnly` flag if JS doesn't need to read the cookie
4. **Expiration**: Implement cookie expiration for production use
5. **Rate limiting**: Limit cookie generation to prevent abuse
6. **One-time use**: Consider invalidating cookies after first use for sensitive actions

## Implementation Checklist

- [ ] MCP tool for cookie generation (requires ATXP auth)
- [ ] Database table for cookie-to-account mapping
- [ ] Cookie validation in API routes
- [ ] Frontend guidance for setting cookies
- [ ] Cookie expiration (optional)
- [ ] Rate limiting (optional)

## Example: Adding to Your MCP Server

```typescript
// 1. Add database table
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_cookies (
    cookie_value TEXT PRIMARY KEY,
    atxp_account TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 2. Create MCP tool
export const authCookieTool = defineTool(
  'my_app_cookie',
  'Get an authentication cookie for browser use',
  z.object({}),
  async () => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Authentication required');

    const cookie = crypto.randomBytes(32).toString('hex');
    db.prepare(`INSERT INTO auth_cookies VALUES (?, ?)`).run(cookie, user.account);

    return { cookie };
  }
);

// 3. Validate in API routes
app.post('/api/action', (req, res) => {
  const cookie = req.cookies.my_app_cookie;
  const account = db.prepare(`SELECT atxp_account FROM auth_cookies WHERE cookie_value = ?`).get(cookie);

  if (!account) {
    return res.status(401).json({ error: 'Invalid cookie' });
  }

  // Proceed with action as `account.atxp_account`
});
```

## Benefits

- **Stateless sessions**: No complex session management needed
- **Agent-friendly**: Works with MCP-based authentication
- **Browser-compatible**: Standard cookie mechanism
- **Auditable**: Can track which agent performed which actions
- **Flexible**: Easy to add expiration, revocation, etc.
