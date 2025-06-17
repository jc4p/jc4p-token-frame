import { Hono } from 'hono'
import { savePurchase, saveRedemption } from '../services/database.js'

const app = new Hono()

// POST /api/webhook/events - Receive blockchain events
// This endpoint would be called by a blockchain indexer service
app.post('/webhook/events', async (c) => {
  try {
    const { event, data } = await c.req.json()
    
    // Verify webhook signature if needed
    // const signature = c.req.header('X-Webhook-Signature')
    // if (!verifyWebhookSignature(signature, body)) {
    //   return c.json({ error: 'Invalid signature' }, 401)
    // }
    
    switch (event) {
      case 'TokensPurchased':
        await savePurchase(c.env.DB, {
          txHash: data.transactionHash,
          blockNumber: data.blockNumber,
          timestamp: new Date(data.timestamp).toISOString(),
          buyer: data.buyer,
          fid: data.fid,
          qty: data.qty,
          price: data.price,
          discountPercentage: data.discountPercentage,
          discountReason: data.discountReason
        })
        break
        
      case 'Redeemed':
        await saveRedemption(c.env.DB, {
          txHash: data.transactionHash,
          blockNumber: data.blockNumber,
          timestamp: new Date(data.timestamp).toISOString(),
          userAddress: data.user,
          fid: data.fid,
          qty: data.qty,
          workCID: data.workCID,
          status: 'pending'
        })
        break
        
      default:
        return c.json({ error: 'Unknown event type' }, 400)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Failed to process event' }, 500)
  }
})

export default app