import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authMiddleware from './middleware/auth.js'
import voucherRoutes from './routes/voucher.js'
import userRoutes from './routes/user.js'
import rpcRoutes from './routes/rpc.js'
import historyRoutes from './routes/history.js'
import adminRoutes from './routes/admin.js'
import redemptionRoutes from './routes/redemption.js'
import contractRoutes from './routes/contract.js'
import transactionRoutes from './routes/transaction.js'

const app = new Hono()

// Enable CORS for all routes
app.use('*', cors())

// Apply auth middleware to all /api routes except /api/rpc and /api/admin
app.use('/api/*', async (c, next) => {
  // Skip auth for RPC proxy and admin routes (admin has its own auth)
  if (c.req.path.startsWith('/api/rpc') || c.req.path.startsWith('/api/admin')) {
    return next()
  }
  return authMiddleware(c, next)
})

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'jc4p-dev-hours-api' })
})

// Mount routes
app.route('/api', voucherRoutes)
app.route('/api', userRoutes)
app.route('/api', rpcRoutes)
app.route('/api', historyRoutes)
app.route('/api', adminRoutes)
app.route('/api', redemptionRoutes)
app.route('/api', contractRoutes)
app.route('/api', transactionRoutes)

// Error handler
app.onError((err, c) => {
  console.error('Global error:', err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Export scheduled handler for cron jobs
import scheduledHandler from './scheduled.js'

// Export for Cloudflare Workers - must include both fetch and scheduled
export default {
  fetch: app.fetch,
  scheduled: scheduledHandler.scheduled
}
