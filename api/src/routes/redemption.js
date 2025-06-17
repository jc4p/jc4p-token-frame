import { Hono } from 'hono'
import { nanoid } from 'nanoid'

const app = new Hono()

// POST /api/redemption/request - Create a redemption request
app.post('/redemption/request', async (c) => {
  const user = c.get('user')
  
  try {
    const { qty, requestContent } = await c.req.json()
    
    // Validate inputs
    if (!qty || qty < 1) {
      return c.json({ error: 'Invalid quantity' }, 400)
    }
    
    if (!requestContent || typeof requestContent !== 'string' || requestContent.trim().length === 0) {
      return c.json({ error: 'Request content is required' }, 400)
    }
    
    // Generate unique ID for this request
    const requestId = nanoid()
    
    // Save request to database
    const query = `
      INSERT INTO redemption_requests (
        id, user_address, fid, qty, request_content, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    
    await c.env.DB.prepare(query).bind(
      requestId,
      user.primaryAddress?.toLowerCase() || null,
      user.fid,
      qty,
      requestContent.trim(),
      'pending'
    ).run()
    
    return c.json({
      success: true,
      requestId,
      message: 'Use this requestId as the workCID when calling the redeem function on the smart contract'
    })
    
  } catch (error) {
    console.error('Error creating redemption request:', error)
    return c.json({ error: 'Failed to create redemption request' }, 500)
  }
})

// GET /api/redemption/request/:id - Get redemption request details (only for the owner)
app.get('/redemption/request/:id', async (c) => {
  const user = c.get('user')
  const requestId = c.req.param('id')
  
  try {
    // Fetch request from database
    const query = `
      SELECT * FROM redemption_requests 
      WHERE id = ? AND (user_address = ? OR fid = ?)
    `
    
    const result = await c.env.DB.prepare(query).bind(
      requestId,
      user.primaryAddress?.toLowerCase() || '',
      user.fid
    ).first()
    
    if (!result) {
      return c.json({ error: 'Request not found or access denied' }, 404)
    }
    
    return c.json({
      id: result.id,
      qty: result.qty,
      requestContent: result.request_content,
      status: result.status,
      createdAt: result.created_at,
      txHash: result.tx_hash,
      completedAt: result.completed_at
    })
    
  } catch (error) {
    console.error('Error fetching redemption request:', error)
    return c.json({ error: 'Failed to fetch redemption request' }, 500)
  }
})

// GET /api/redemption/requests - Get all redemption requests for the authenticated user
app.get('/redemption/requests', async (c) => {
  const user = c.get('user')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')
  
  try {
    // Get requests
    const query = `
      SELECT id, qty, status, created_at, tx_hash, completed_at
      FROM redemption_requests
      WHERE user_address = ? OR fid = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    
    const result = await c.env.DB.prepare(query).bind(
      user.primaryAddress?.toLowerCase() || '',
      user.fid,
      limit,
      offset
    ).all()
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM redemption_requests 
      WHERE user_address = ? OR fid = ?
    `
    const countResult = await c.env.DB.prepare(countQuery).bind(
      user.primaryAddress?.toLowerCase() || '',
      user.fid
    ).first()
    
    return c.json({
      requests: result.results.map(row => ({
        id: row.id,
        qty: row.qty,
        status: row.status,
        createdAt: row.created_at,
        txHash: row.tx_hash,
        completedAt: row.completed_at
      })),
      pagination: {
        limit,
        offset,
        total: countResult?.count || 0,
        hasMore: offset + limit < (countResult?.count || 0)
      }
    })
    
  } catch (error) {
    console.error('Error fetching redemption requests:', error)
    return c.json({ error: 'Failed to fetch redemption requests' }, 500)
  }
})

export default app