# Frontend Integration Guide

## Quick Start

All endpoints are ready for integration! Here's what you need to know:

### Base URL
- Development: `http://localhost:8787`
- Production: `https://dev-hours-api.kasra.codes`

### Authentication
All endpoints except `/api/rpc` require a Bearer token from Quick Auth:

```javascript
// Using Frame SDK
const response = await sdk.quickAuth.fetch(`${API_URL}/api/me`);
```

## Available Endpoints

### ✅ GET /api/voucher
Get a signed voucher for purchasing dev hours.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/voucher?qty=2&buyer=${userAddress}`
);
const { voucher, signature, discount } = await response.json();

// Response includes discount information:
// {
//   voucher: { buyer, qty, price, nonce },
//   signature: "0x...",
//   discount: {
//     percentage: 10,  // 0, 5, or 10
//     reason: "OG Auction Bidder" // null, "oomfie", or "OG Auction Bidder"
//   }
// }
```

**Available Discounts:**
- **10% off** - OG Auction Bidder (FIDs: 1237, 2745, 11528)
- **5% off** - Oomfie discount (mutual followers with FID 977233)

### ✅ GET /api/me
Get authenticated user info.

```javascript
const response = await sdk.quickAuth.fetch(`${API_URL}/api/me`);
const { fid, address } = await response.json();
```

### ✅ GET /api/nonce/{address}
Get current nonce for an address.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/nonce/${userAddress}`
);
const { nonce } = await response.json();
```

### ✅ GET /api/history/purchases
Get purchase history for the authenticated user.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/history/purchases?limit=10&offset=0`
);
const { purchases, pagination } = await response.json();
```

### ✅ GET /api/history/redemptions
Get redemption history for the authenticated user.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/history/redemptions?limit=10&offset=0`
);
const { redemptions, pagination } = await response.json();
```

### ✅ GET /api/history/global
Get global activity feed showing all purchases and redemptions for social proof.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/history/global?limit=20&offset=0`
);
const { activities, pagination } = await response.json();

// Each activity has a type field: "purchase" or "redemption"
// Purchase activities include price and discount info
// Redemption activities include workCID and status
```

### ✅ POST /api/redemption/request
Create a redemption request before calling the smart contract.

```javascript
const response = await sdk.quickAuth.fetch(`${API_URL}/api/redemption/request`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    qty: 2,
    requestContent: "Build a React component for displaying user profiles"
  })
});
const { requestId } = await response.json();

// Use the requestId as workCID when calling the smart contract redeem function
```

### ✅ GET /api/redemption/request/:id
Get details of a specific redemption request (only accessible by the creator).

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/redemption/request/${requestId}`
);
const { requestContent, status, txHash } = await response.json();
```

### ✅ GET /api/redemption/requests
Get all redemption requests for the authenticated user.

```javascript
const response = await sdk.quickAuth.fetch(
  `${API_URL}/api/redemption/requests?limit=10&offset=0`
);
const { requests, pagination } = await response.json();
```

### ✅ GET /api/contract/info
Get comprehensive contract and user information.

```javascript
const response = await sdk.quickAuth.fetch(`${API_URL}/api/contract/info`);
const data = await response.json();

// Response includes:
// - Contract addresses and chain ID
// - User's token balance and current nonce
// - Remaining supply and weekly redemption capacity
// - Pricing information
```

### ✅ GET /api/contract/domain
Get EIP-712 domain and type information for signing.

```javascript
const response = await sdk.quickAuth.fetch(`${API_URL}/api/contract/domain`);
const { domain, voucherType, permitType } = await response.json();

// Use this for creating EIP-712 signatures
```

### ✅ POST /api/rpc
JSON-RPC proxy for contract reads (no auth required).

```javascript
const response = await fetch(`${API_URL}/api/rpc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{
      to: CONTRACT_ADDRESS,
      data: balanceOfCalldata
    }, 'latest'],
    id: 1
  })
});
```

## Important Contract Integration Notes

**CRITICAL**: The JC4PDevHours contract uses USDC permits, NOT the standard approve/transferFrom flow:

1. **Contract Function**: Use `buyWithVoucherAndPermit`, not a standard buy function
2. **USDC Permits Required**: The contract expects EIP-2612 permit signatures for USDC
3. **Voucher Structure**: Vouchers now include a `fid` field (Farcaster ID)
4. **No Approval Needed**: Do NOT call USDC.approve() - use permits instead

Example flow:
1. Get voucher from `/api/voucher`
2. Create USDC permit signature (deadline, v, r, s)
3. Call `buyWithVoucherAndPermit(voucher, voucherSig, permitData)`

## Important Notes

1. **CORS is enabled** - You can call these endpoints from your Frame frontend.

2. **Voucher Nonces** - The API automatically tracks and increments nonces. Each successful voucher request will use the next nonce.

3. **Price Calculation** - Base price is 300 USDC per hour. Discounts are automatically applied based on your FID:
   - OG Auction Bidders get 10% off (270 USDC per hour)
   - Mutual followers with FID 977233 get 5% off (285 USDC per hour)

4. **History Endpoints** - These endpoints now return real data from the blockchain! The scheduled task syncs events every 5 minutes, so there may be a slight delay for new transactions to appear.

5. **RPC Proxy** - Only allows safe read methods. Perfect for checking balances, supply, etc.

## Testing the API

1. Health check (no auth):
```bash
curl http://localhost:8787/
```

2. Test auth with your token:
```bash
curl http://localhost:8787/api/me \
  -H "Authorization: Bearer YOUR_QUICK_AUTH_TOKEN"
```

3. Get a voucher:
```bash
curl "http://localhost:8787/api/voucher?qty=2&buyer=0xYOUR_ADDRESS" \
  -H "Authorization: Bearer YOUR_QUICK_AUTH_TOKEN"
```

## Next Steps

The API is fully functional for the MVP! The only enhancement needed is to add event indexing to populate the history endpoints with real data from the blockchain.