const NEYNAR_API_BASE = 'https://api.neynar.com/v2'

export async function fetchUsersByFids(env, fids, viewerFid = null) {
  const url = new URL(`${NEYNAR_API_BASE}/farcaster/user/bulk`)
  url.searchParams.append('fids', fids.join(','))
  if (viewerFid) {
    url.searchParams.append('viewer_fid', viewerFid)
  }

  const response = await fetch(url, {
    headers: {
      'x-api-key': env.NEYNAR_API_KEY,
      'x-neynar-experimental': 'false',
    },
  })

  if (!response.ok) {
    throw new Error(`Neynar API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.users
}

export async function checkMutualFollow(env, fid1, fid2) {
  try {
    // Fetch both users with viewer context
    const users = await fetchUsersByFids(env, [fid1, fid2], fid1)
    
    // Find the fid2 user in the results
    const targetUser = users.find(u => u.fid === fid2)
    
    if (!targetUser || !targetUser.viewer_context) {
      return false
    }
    
    // Check if both users follow each other
    // viewer_context.following means fid1 follows fid2
    // viewer_context.followed_by means fid2 follows fid1
    return targetUser.viewer_context.following && targetUser.viewer_context.followed_by
  } catch (error) {
    console.error('Error checking mutual follow:', error)
    return false
  }
}

export async function getUserPrimaryAddress(env, fid) {
  try {
    const users = await fetchUsersByFids(env, [fid])
    if (users.length === 0) {
      return null
    }
    
    const user = users[0]
    // Return the primary ETH address if available
    return user.verified_addresses?.primary?.eth_address || 
           (user.verified_addresses?.eth_addresses?.[0]) || 
           user.custody_address || 
           null
  } catch (error) {
    console.error('Error fetching user primary address:', error)
    return null
  }
}