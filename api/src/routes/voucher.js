import { Hono } from 'hono'
import { getContractNonce } from '../services/contract.js'
import { signVoucher, calculatePrice } from '../services/signer.js'
import { checkMutualFollow } from '../services/neynar.js'

const app = new Hono()

// OG Auction Bidder FIDs from contract 0xB1e0d6ADdc6562bc9d8F7014374DA79535495Ff9
const OG_AUCTION_BIDDER_FIDS = [1237, 2745, 11528]

// GET /api/voucher?qty=X&buyer=0x...
app.get('/voucher', async (c) => {
  const qty = parseInt(c.req.query('qty'))
  const buyer = c.req.query('buyer')
  
  // Validate inputs
  if (!qty || qty < 1 || qty > 50) {
    return c.json({ error: 'Invalid quantity. Must be between 1 and 50.' }, 400)
  }
  
  if (!buyer || !/^0x[a-fA-F0-9]{40}$/i.test(buyer)) {
    return c.json({ error: 'Invalid buyer address' }, 400)
  }
  
  // Verify the buyer matches the authenticated user
  const user = c.get('user')
  if (user.primaryAddress && user.primaryAddress.toLowerCase() !== buyer.toLowerCase()) {
    return c.json({ error: 'Buyer address does not match authenticated user' }, 403)
  }

  try {
    // Always get nonce from contract to ensure accuracy
    const nonce = await getContractNonce(c.env, buyer)
    // console.log(`Voucher generation for ${buyer}: nonce=${nonce}, fid=${user.fid}`)
    
    // Check for discounts
    let discountPercentage = 0
    let discountReason = null
    
    if (user.fid) {
      // Dev-only 90% discount for FID 977233
      const isDev = c.env.HOSTNAME?.includes('localhost') || c.env.HOSTNAME?.includes('127.0.0.1') || c.env.HOSTNAME?.includes('ngrok')
      if (isDev && user.fid === 977233) {
        discountPercentage = 90
        discountReason = 'Developer Testing'
      } else if (OG_AUCTION_BIDDER_FIDS.includes(user.fid)) {
        // OG Auction Bidder (10% discount)
        discountPercentage = 10
        discountReason = 'OG Auction Bidder'
      } else {
        // Otherwise check if user is mutual with FID 977233 for oomfie discount (5%)
        const OOMFIE_FID = 977233
        const isMutual = await checkMutualFollow(c.env, user.fid, OOMFIE_FID)
        if (isMutual) {
          discountPercentage = 5
          discountReason = 'oomfie'
        }
      }
    }
    
    // Calculate price with discount
    const price = calculatePrice(qty, discountPercentage)
    
    // Calculate actual effective discount based on final price
    const BASE_PRICE = 300_000_000 // 300 USDC per hour
    const baseTotal = qty * BASE_PRICE
    const actualDiscount = baseTotal - price
    const effectiveDiscountPercentage = Math.floor((actualDiscount * 100) / baseTotal)
    
    // Create voucher - use buyer address as-is (no lowercasing) for signature
    const voucher = {
      buyer: buyer,
      qty,
      price,
      nonce,
      fid: user.fid || 0,
    }
    
    // Sign voucher
    const signature = await signVoucher(c.env, voucher)
    
    // Don't cache nonce anymore since we always read from contract
    
    return c.json({
      voucher: {
        buyer: voucher.buyer,
        qty: voucher.qty,
        price: voucher.price,
        nonce: voucher.nonce,
        fid: voucher.fid
      },
      signature,
      discount: {
        percentage: effectiveDiscountPercentage,
        reason: effectiveDiscountPercentage > 0 ? discountReason : null,
      },
      expiresAt: null, // Vouchers don't expire in this implementation
    })
  } catch (error) {
    console.error('Error generating voucher:', error)
    return c.json({ error: 'Failed to generate voucher' }, 500)
  }
})

export default app