import { Hono } from 'hono'
import { getBalance, getRemainingSupply, getRemainingWeeklyCapacity, getContractNonce } from '../services/contract.js'

const app = new Hono()

// GET /api/contract/info - Get contract information
app.get('/contract/info', async (c) => {
  const user = c.get('user')
  
  try {
    // Get various contract states
    const [balance, remainingSupply, weeklyCapacity, nonce] = await Promise.all([
      user.primaryAddress ? getBalance(c.env, user.primaryAddress) : Promise.resolve(0),
      getRemainingSupply(c.env),
      getRemainingWeeklyCapacity(c.env),
      user.primaryAddress ? getContractNonce(c.env, user.primaryAddress) : Promise.resolve(0)
    ])
    
    return c.json({
      contract: {
        address: c.env.CONTRACT_ADDRESS,
        chainId: parseInt(c.env.CHAIN_ID),
        usdcAddress: c.env.USDC_ADDRESS,
      },
      user: {
        fid: user.fid,
        address: user.primaryAddress,
        balance,
        nonce,
      },
      supply: {
        remaining: remainingSupply,
        weeklyCapacity,
      },
      pricing: {
        basePrice: 300_000_000, // 300 USDC in 6 decimals
        minPricePerHour: 100_000_000, // 100 USDC minimum per hour
      }
    })
  } catch (error) {
    console.error('Error fetching contract info:', error)
    return c.json({ error: 'Failed to fetch contract information' }, 500)
  }
})

// GET /api/contract/domain - Get EIP-712 domain for permit signing
app.get('/contract/domain', async (c) => {
  return c.json({
    domain: {
      name: 'JC4PDevHours',
      version: '1',
      chainId: parseInt(c.env.CHAIN_ID),
      verifyingContract: c.env.CONTRACT_ADDRESS,
    },
    voucherType: {
      Voucher: [
        { name: 'buyer', type: 'address' },
        { name: 'qty', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'fid', type: 'uint256' },
      ]
    },
    permitType: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ]
    }
  })
})

export default app