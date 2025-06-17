import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

// POST /api/admin/sync - Manually trigger blockchain sync
// This endpoint requires special authorization
app.post('/admin/sync', async (c) => {
  // Check for admin authorization
  const adminKey = c.req.header('X-Admin-Key')
  if (!adminKey || adminKey !== c.env.ADMIN_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  
  try {
    // Import and run the sync function
    const { default: scheduled } = await import('../scheduled.js')
    await scheduled.scheduled(null, c.env, c.executionCtx)
    
    return c.json({ 
      success: true, 
      message: 'Blockchain sync triggered' 
    })
  } catch (error) {
    console.error('Manual sync failed:', error)
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500)
  }
})

// GET /api/admin/sync-status - Get sync status
app.get('/admin/sync-status', async (c) => {
  try {
    const lastSyncedBlock = await c.env.NONCE_KV.get('last_synced_block')
    
    // Get recent purchase and redemption counts
    const purchaseCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM purchases'
    ).first()
    
    const redemptionCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM redemptions'
    ).first()
    
    return c.json({
      lastSyncedBlock: lastSyncedBlock || 'never',
      totalPurchases: purchaseCount?.count || 0,
      totalRedemptions: redemptionCount?.count || 0,
      syncInterval: '5 minutes'
    })
  } catch (error) {
    console.error('Failed to get sync status:', error)
    return c.json({ error: 'Failed to get sync status' }, 500)
  }
})

export default app