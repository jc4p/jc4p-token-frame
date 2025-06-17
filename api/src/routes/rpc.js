import { Hono } from 'hono'

const app = new Hono()

// Allowed RPC methods for safety
const ALLOWED_METHODS = [
  'eth_call',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_gasPrice',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_getLogs',
  'eth_chainId',
  'net_version',
]

// POST /api/rpc - JSON-RPC proxy
app.post('/rpc', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate JSON-RPC request
    if (!body.jsonrpc || !body.method || body.id === undefined) {
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: body.id || null,
      }, 400)
    }
    
    // Check if method is allowed
    if (!ALLOWED_METHODS.includes(body.method)) {
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found',
        },
        id: body.id,
      }, 400)
    }
    
    // Forward request to Alchemy
    const response = await fetch(c.env.ALCHEMY_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const result = await response.json()
    return c.json(result)
    
  } catch (error) {
    console.error('RPC proxy error:', error)
    return c.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
      },
      id: null,
    }, 500)
  }
})

// GET /api/rpc - Return RPC info
app.get('/rpc', (c) => {
  return c.json({
    endpoint: '/api/rpc',
    methods: ALLOWED_METHODS,
    chainId: parseInt(c.env.CHAIN_ID),
    network: 'base',
  })
})

export default app