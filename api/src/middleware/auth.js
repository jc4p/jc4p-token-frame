import { Errors, createClient } from '@farcaster/quick-auth'
import { HTTPException } from 'hono/http-exception'
import { getUserPrimaryAddress } from '../services/neynar.js'

const client = createClient()

export default async function authMiddleware(c, next) {
  const authorization = c.req.header('Authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing token' })
  }

  try {
    const token = authorization.split(' ')[1]
    
    // Get hostname from request headers
    const url = new URL(c.req.url)
    // const domain = c.req.header('host') || url.host
    const domain = 'kasra.ngrok.app'
    
    const payload = await client.verifyJwt({
      token,
      domain,
    })

    // Set the fid from the token
    const fid = payload.sub
    
    // Fetch primary address from Neynar
    const primaryAddress = await getUserPrimaryAddress(c.env, fid)
    
    c.set('user', {
      fid,
      primaryAddress
    })
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      console.info('Invalid token:', e.message)
      throw new HTTPException(401, { message: 'Invalid token' })
    }

    console.error('Auth error:', e)
    throw e
  }

  await next()
}