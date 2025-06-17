# JC4P Dev Hours API

API backend for the JC4P Dev Hours Farcaster Frame, built with Cloudflare Workers and Hono.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure KV namespace:
```bash
# Create KV namespace
wrangler kv:namespace create "NONCE_KV"
wrangler kv:namespace create "NONCE_KV" --preview

# Update the IDs in wrangler.toml
```

3. Set secrets:
```bash
wrangler secret put ALCHEMY_RPC_URL
wrangler secret put SIGNER_PRIVATE_KEY
```

4. Update environment variables in `wrangler.toml`:
- `CONTRACT_ADDRESS`: Deployed JC4PDevHours contract
- `SIGNER_ADDRESS`: Address corresponding to SIGNER_PRIVATE_KEY
- `HOSTNAME`: Your API domain

## Development

```bash
bun run dev
```

## API Endpoints

### Authentication Required

All endpoints except `/api/rpc` require a Bearer token from Farcaster Quick Auth.

#### GET /api/me
Get authenticated user info.

**Response:**
```json
{
  "fid": 12345,
  "address": "0x..."
}
```

#### GET /api/voucher?qty=X&buyer=0x...
Get a signed voucher for purchasing dev hours.

**Query Parameters:**
- `qty`: Number of hours (1-50)
- `buyer`: Ethereum address of purchaser

**Response:**
```json
{
  "voucher": {
    "buyer": "0x...",
    "qty": 2,
    "price": 600000000,
    "nonce": 0
  },
  "signature": "0x...",
  "discount": {
    "percentage": 0,
    "reason": null
  },
  "expiresAt": null
}
```

#### GET /api/nonce/{address}
Get current nonce for an address.

**Response:**
```json
{
  "address": "0x...",
  "nonce": 3,
  "source": "cache" | "contract"
}
```

#### GET /api/history/purchases
Get purchase history for authenticated user.

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "purchases": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0,
    "hasMore": false
  },
  "user": {
    "fid": 12345,
    "address": "0x..."
  }
}
```

#### GET /api/history/redemptions
Get redemption history for authenticated user.

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "redemptions": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0,
    "hasMore": false
  },
  "user": {
    "fid": 12345,
    "address": "0x..."
  }
}
```

### No Authentication

#### POST /api/rpc
JSON-RPC proxy to Alchemy. Only read methods allowed.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [...],
  "id": 1
}
```

## Blockchain Event Sync

The API includes a scheduled worker that runs every 5 minutes to sync blockchain events:

- Fetches `TokensPurchased` and `Redeemed` events from the contract
- Stores them in the D1 database
- Tracks last synced block to avoid duplicates
- Processes up to 2000 blocks per run to prevent timeouts

### Manual Sync

You can trigger a manual sync (requires admin key):

```bash
curl -X POST http://localhost:8787/api/admin/sync \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

Check sync status:
```bash
curl http://localhost:8787/api/admin/sync-status
```

## Deployment

```bash
bun run deploy
```

Don't forget to set the ADMIN_KEY secret for production:
```bash
wrangler secret put ADMIN_KEY
```
