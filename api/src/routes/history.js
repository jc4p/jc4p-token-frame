import { Hono } from 'hono'
import { getPurchaseHistoryMultiAddress, getRedemptionHistoryMultiAddress, getGlobalActivity } from '../services/database.js'
import { fetchUsersByFids } from '../services/neynar.js'

const app = new Hono()

// GET /api/history/purchases - Get purchase history for authenticated user
app.get('/history/purchases', async (c) => {
  const user = c.get('user')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    const result = await getPurchaseHistoryMultiAddress(
      c.env.DB,
      user.addresses || [],
      user.fid,
      limit,
      offset
    )
    
    return c.json({
      ...result,
      user: {
        fid: user.fid,
        address: user.primaryAddress,
        addresses: user.addresses || []
      }
    })
  } catch (error) {
    console.error('Error fetching purchase history:', error)
    // Fallback to empty response if DB not available
    return c.json({
      purchases: [],
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false
      },
      user: {
        fid: user.fid,
        address: user.primaryAddress,
        addresses: user.addresses || []
      }
    })
  }
})

// GET /api/history/redemptions - Get redemption history for authenticated user
app.get('/history/redemptions', async (c) => {
  const user = c.get('user')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    const result = await getRedemptionHistoryMultiAddress(
      c.env.DB,
      user.addresses || [],
      user.fid,
      limit,
      offset
    )
    
    return c.json({
      ...result,
      user: {
        fid: user.fid,
        address: user.primaryAddress,
        addresses: user.addresses || []
      }
    })
  } catch (error) {
    console.error('Error fetching redemption history:', error)
    // Fallback to empty response if DB not available
    return c.json({
      redemptions: [],
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false
      },
      user: {
        fid: user.fid,
        address: user.primaryAddress,
        addresses: user.addresses || []
      }
    })
  }
})

// GET /api/history/global - Get global activity for social proof
app.get('/history/global', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50)
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    const result = await getGlobalActivity(
      c.env.DB,
      limit,
      offset
    )
    
    // Extract unique FIDs from activities
    const fids = [...new Set(result.activities
      .filter(activity => activity.fid)
      .map(activity => activity.fid))]
    
    // If we have FIDs, fetch user data from Neynar
    let userMap = {}
    if (fids.length > 0) {
      try {
        const users = await fetchUsersByFids(c.env, fids)
        // Create a map of FID to user data
        userMap = users.reduce((acc, user) => {
          acc[user.fid] = {
            username: user.username,
            displayName: user.display_name,
            pfpUrl: user.pfp_url,
            verifiedAddresses: user.verified_addresses?.eth_addresses || []
          }
          return acc
        }, {})
      } catch (error) {
        console.error('Error fetching user data from Neynar:', error)
        // Continue without user data if Neynar fails
      }
    }
    
    // Enrich activities with user data
    const enrichedActivities = result.activities.map(activity => ({
      ...activity,
      user: activity.fid ? userMap[activity.fid] || null : null
    }))
    
    return c.json({
      ...result,
      activities: enrichedActivities
    })
  } catch (error) {
    console.error('Error fetching global activity:', error)
    // Fallback to empty response if DB not available
    return c.json({
      activities: [],
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false
      }
    })
  }
})

export default app

// Example response structures for frontend reference:
/*
Purchase response:
{
  "purchases": [
    {
      "txHash": "0x...",
      "blockNumber": 12345678,
      "timestamp": "2024-01-15T10:30:00Z",
      "buyer": "0x...",
      "qty": 2,
      "price": "600000000",
      "discount": {
        "percentage": 5,
        "reason": "oomfie"
      }
    }
  ],
  "pagination": { ... }
}

Redemption response:
{
  "redemptions": [
    {
      "txHash": "0x...",
      "blockNumber": 12345679,
      "timestamp": "2024-01-16T14:20:00Z",
      "user": "0x...",
      "qty": 1,
      "workCID": "ipfs://QmWorkSpecificationHash",
      "status": "pending" // pending, completed, cancelled
    }
  ],
  "pagination": { ... }
}

Global activity response:
{
  "activities": [
    {
      "type": "purchase",
      "txHash": "0x...",
      "blockNumber": 12345678,
      "timestamp": "2024-01-15T10:30:00Z",
      "address": "0x...",
      "fid": 2745,
      "qty": 2,
      "price": "600000000",
      "discount": {
        "percentage": 10,
        "reason": "OG Auction Bidder"
      },
      "user": {
        "username": "dwr",
        "displayName": "Dan Romero",
        "pfpUrl": "https://...",
        "verifiedAddresses": ["0x..."]
      }
    },
    {
      "type": "redemption",
      "txHash": "0x...",
      "blockNumber": 12345679,
      "timestamp": "2024-01-16T14:20:00Z",
      "address": "0x...",
      "fid": 1237,
      "qty": 1,
      "workCID": "ipfs://QmWorkSpecificationHash",
      "status": "pending",
      "user": {
        "username": "v",
        "displayName": "V",
        "pfpUrl": "https://...",
        "verifiedAddresses": ["0x..."]
      }
    }
  ],
  "pagination": { ... }
}
*/