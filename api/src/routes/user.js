import { Hono } from 'hono'
import { getContractNonce } from '../services/contract.js'

const app = new Hono()

// GET /api/me - Get authenticated user info
app.get('/me', (c) => {
  const user = c.get('user')
  return c.json({
    fid: user.fid,
    address: user.primaryAddress,
  })
})

// GET /api/nonce/{address} - Get current nonce for an address
app.get('/nonce/:address', async (c) => {
  const address = c.req.param('address')
  
  // Validate Ethereum address
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return c.json({ error: 'Invalid Ethereum address' }, 400)
  }

  try {
    // First check KV cache
    const cachedNonce = await c.env.NONCE_KV.get(`nonce:${address.toLowerCase()}`)
    if (cachedNonce !== null) {
      return c.json({
        address: address.toLowerCase(),
        nonce: parseInt(cachedNonce),
        source: 'cache'
      })
    }

    // If not in cache, fetch from contract
    const nonce = await getContractNonce(c.env, address)
    
    // Cache the nonce with 30 second TTL
    await c.env.NONCE_KV.put(
      `nonce:${address.toLowerCase()}`, 
      nonce.toString(),
      { expirationTtl: 30 }
    )

    return c.json({
      address: address.toLowerCase(),
      nonce: nonce,
      source: 'contract'
    })
  } catch (error) {
    console.error('Error fetching nonce:', error)
    return c.json({ error: 'Failed to fetch nonce' }, 500)
  }
})

export default app