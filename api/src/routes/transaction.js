import { Hono } from 'hono'
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { savePurchase, saveRedemption } from '../services/database.js'

const app = new Hono()

// Event signatures
const EVENTS = {
  TokensPurchased: parseAbiItem('event TokensPurchased(address indexed buyer, uint256 qty, uint256 price)'),
  Redeemed: parseAbiItem('event Redeemed(address indexed user, uint256 qty, string workCID)')
}

// POST /api/transaction/verify - Verify and save a transaction immediately
app.post('/transaction/verify', async (c) => {
  const user = c.get('user')
  
  try {
    const { txHash } = await c.req.json()
    
    if (!txHash || typeof txHash !== 'string') {
      return c.json({ error: 'Transaction hash is required' }, 400)
    }
    
    // Initialize viem client
    const client = createPublicClient({
      chain: base,
      transport: http(c.env.ALCHEMY_RPC_URL),
    })
    
    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash })
    
    if (!receipt) {
      return c.json({ error: 'Transaction not found' }, 404)
    }
    
    // Check if it's our contract
    if (receipt.to?.toLowerCase() !== c.env.CONTRACT_ADDRESS.toLowerCase()) {
      return c.json({ error: 'Transaction is not for the expected contract' }, 400)
    }
    
    // Get the full transaction for input decoding
    const tx = await client.getTransaction({ hash: txHash })
    const block = await client.getBlock({ blockNumber: receipt.blockNumber })
    
    // Process based on the events in the receipt
    let processed = false
    let result = null
    
    // Check for TokensPurchased event
    const purchaseLog = receipt.logs.find(log => {
      try {
        const decoded = client.decodeEventLog({
          abi: [EVENTS.TokensPurchased],
          data: log.data,
          topics: log.topics
        })
        return decoded.eventName === 'TokensPurchased'
      } catch {
        return false
      }
    })
    
    if (purchaseLog) {
      // Decode the purchase event
      const event = client.decodeEventLog({
        abi: [EVENTS.TokensPurchased],
        data: purchaseLog.data,
        topics: purchaseLog.topics
      })
      
      // Check if already exists
      const existing = await c.env.DB.prepare(
        'SELECT id FROM purchases WHERE tx_hash = ?'
      ).bind(txHash).first()
      
      if (!existing) {
        let fid = user.fid // Default to authenticated user's FID
        let discountPercentage = 0
        let discountReason = null
        
        // Try to decode transaction input to get FID and discount info
        try {
          const functionAbi = parseAbi([
            'function buyWithVoucherAndPermit(tuple(address buyer, uint256 qty, uint256 price, uint256 nonce, uint256 fid) v, bytes vSig, tuple(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline, uint8 v, bytes32 r, bytes32 s) p)'
          ])
          
          const decoded = client.decodeFunctionData({
            abi: functionAbi,
            data: tx.input
          })
          
          if (decoded && decoded.functionName === 'buyWithVoucherAndPermit' && decoded.args) {
            // Extract FID from the voucher tuple
            const voucherFid = decoded.args[0].fid
            if (voucherFid) {
              fid = Number(voucherFid)
            }
          }
        } catch (decodeError) {
          console.warn('Could not decode tx input, using authenticated FID:', decodeError.message)
        }
        
        await savePurchase(c.env.DB, {
          txHash: txHash,
          blockNumber: Number(receipt.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          buyer: event.args.buyer,
          fid: fid,
          qty: Number(event.args.qty),
          price: event.args.price.toString(),
          discountPercentage: discountPercentage,
          discountReason: discountReason
        })
        
        result = {
          type: 'purchase',
          saved: true,
          data: {
            buyer: event.args.buyer,
            fid: fid,
            qty: Number(event.args.qty),
            price: event.args.price.toString()
          }
        }
        processed = true
      } else {
        result = {
          type: 'purchase',
          saved: false,
          message: 'Transaction already recorded'
        }
        processed = true
      }
    }
    
    // Check for Redeemed event
    const redeemLog = receipt.logs.find(log => {
      try {
        const decoded = client.decodeEventLog({
          abi: [EVENTS.Redeemed],
          data: log.data,
          topics: log.topics
        })
        return decoded.eventName === 'Redeemed'
      } catch {
        return false
      }
    })
    
    if (redeemLog && !processed) {
      // Decode the redemption event
      const event = client.decodeEventLog({
        abi: [EVENTS.Redeemed],
        data: redeemLog.data,
        topics: redeemLog.topics
      })
      
      // Check if already exists
      const existing = await c.env.DB.prepare(
        'SELECT id FROM redemptions WHERE tx_hash = ?'
      ).bind(txHash).first()
      
      if (!existing) {
        let fid = user.fid // Default to authenticated user's FID
        
        // Try to decode transaction input to get FID
        try {
          const functionAbi = parseAbi([
            'function redeemWithPermit(uint256 qty, uint256 fid, string workCID, tuple(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline, uint8 v, bytes32 r, bytes32 s) p)'
          ])
          
          const decoded = client.decodeFunctionData({
            abi: functionAbi,
            data: tx.input
          })
          
          if (decoded && decoded.functionName === 'redeemWithPermit' && decoded.args) {
            // Extract FID from the arguments
            const txFid = decoded.args[1]
            if (txFid) {
              fid = Number(txFid)
            }
          }
        } catch (decodeError) {
          console.warn('Could not decode tx input, using authenticated FID:', decodeError.message)
        }
        
        await saveRedemption(c.env.DB, {
          txHash: txHash,
          blockNumber: Number(receipt.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          userAddress: event.args.user,
          fid: fid,
          qty: Number(event.args.qty),
          workCID: event.args.workCID,
          status: 'pending'
        })
        
        // If workCID looks like a nanoid, update the redemption request
        const nanoidRegex = /^[A-Za-z0-9_-]{21}$/
        if (nanoidRegex.test(event.args.workCID)) {
          await c.env.DB.prepare(
            'UPDATE redemption_requests SET tx_hash = ?, status = ? WHERE id = ?'
          ).bind(txHash, 'completed', event.args.workCID).run()
        }
        
        result = {
          type: 'redemption',
          saved: true,
          data: {
            user: event.args.user,
            fid: fid,
            qty: Number(event.args.qty),
            workCID: event.args.workCID
          }
        }
        processed = true
      } else {
        result = {
          type: 'redemption',
          saved: false,
          message: 'Transaction already recorded'
        }
        processed = true
      }
    }
    
    if (!processed) {
      return c.json({ 
        error: 'No recognized events found in transaction',
        txHash: txHash 
      }, 400)
    }
    
    return c.json({
      success: true,
      txHash: txHash,
      blockNumber: Number(receipt.blockNumber),
      ...result
    })
    
  } catch (error) {
    console.error('Error verifying transaction:', error)
    return c.json({ 
      error: 'Failed to verify transaction',
      details: error.message 
    }, 500)
  }
})

// GET /api/transaction/:hash - Get transaction details if it exists in our DB
app.get('/transaction/:hash', async (c) => {
  const txHash = c.req.param('hash')
  
  try {
    // Check purchases table
    const purchase = await c.env.DB.prepare(
      'SELECT * FROM purchases WHERE tx_hash = ?'
    ).bind(txHash).first()
    
    if (purchase) {
      return c.json({
        type: 'purchase',
        data: purchase
      })
    }
    
    // Check redemptions table
    const redemption = await c.env.DB.prepare(
      'SELECT * FROM redemptions WHERE tx_hash = ?'
    ).bind(txHash).first()
    
    if (redemption) {
      return c.json({
        type: 'redemption',
        data: redemption
      })
    }
    
    return c.json({ error: 'Transaction not found in database' }, 404)
    
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return c.json({ error: 'Failed to fetch transaction' }, 500)
  }
})

export default app