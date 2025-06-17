import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { savePurchase, saveRedemption } from './services/database.js'

// Contract deployment block - never sync before this
const CONTRACT_DEPLOYMENT_BLOCK = 31663307n

// Event signatures
const EVENTS = {
  TokensPurchased: parseAbiItem('event TokensPurchased(address indexed buyer, uint256 qty, uint256 price)'),
  Redeemed: parseAbiItem('event Redeemed(address indexed user, uint256 qty, string workCID)')
}

// KV keys for tracking last synced block
const SYNC_KEY = 'last_synced_block'

export default {
  async scheduled(event, env, ctx) {
    console.log('Running blockchain sync...')
    
    try {
      await syncBlockchainEvents(env)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }
}

async function syncBlockchainEvents(env) {
  const client = createPublicClient({
    chain: base,
    transport: http(env.ALCHEMY_RPC_URL),
  })
  
  // Get last synced block from KV
  const lastSyncedBlock = await getLastSyncedBlock(env)
  const currentBlock = await client.getBlockNumber()
  
  // Don't sync if we're already up to date
  if (lastSyncedBlock >= currentBlock) {
    console.log('Already up to date')
    return
  }
  
  // Limit range to prevent timeout (max 2000 blocks at a time)
  const fromBlock = lastSyncedBlock + 1n
  const toBlock = fromBlock + 2000n > currentBlock ? currentBlock : fromBlock + 2000n
  
  console.log(`Syncing blocks ${fromBlock} to ${toBlock}`)
  
  // Fetch TokensPurchased events
  const purchaseEvents = await client.getLogs({
    address: env.CONTRACT_ADDRESS,
    event: EVENTS.TokensPurchased,
    fromBlock,
    toBlock,
  })
  
  // Fetch Redeemed events
  const redemptionEvents = await client.getLogs({
    address: env.CONTRACT_ADDRESS,
    event: EVENTS.Redeemed,
    fromBlock,
    toBlock,
  })
  
  // Process purchase events
  for (const event of purchaseEvents) {
    try {
      const block = await client.getBlock({ blockNumber: event.blockNumber })
      
      // Check if already exists
      const existing = await env.DB.prepare(
        'SELECT id FROM purchases WHERE tx_hash = ?'
      ).bind(event.transactionHash).first()
      
      if (!existing) {
        await savePurchase(env.DB, {
          txHash: event.transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          buyer: event.args.buyer,
          qty: Number(event.args.qty),
          price: event.args.price.toString(),
          // Note: We don't have discount info from events, would need to decode tx input
          discountPercentage: 0,
          discountReason: null
        })
        console.log(`Saved purchase: ${event.transactionHash}`)
      }
    } catch (error) {
      console.error(`Failed to process purchase event ${event.transactionHash}:`, error)
    }
  }
  
  // Process redemption events
  for (const event of redemptionEvents) {
    try {
      const block = await client.getBlock({ blockNumber: event.blockNumber })
      
      // Check if already exists
      const existing = await env.DB.prepare(
        'SELECT id FROM redemptions WHERE tx_hash = ?'
      ).bind(event.transactionHash).first()
      
      if (!existing) {
        await saveRedemption(env.DB, {
          txHash: event.transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          userAddress: event.args.user,
          qty: Number(event.args.qty),
          workCID: event.args.workCID,
          status: 'pending'
        })
        
        // If workCID looks like a nanoid (21 chars, alphanumeric with - and _), update the redemption request
        const nanoidRegex = /^[A-Za-z0-9_-]{21}$/
        if (nanoidRegex.test(event.args.workCID)) {
          await env.DB.prepare(
            'UPDATE redemption_requests SET tx_hash = ?, status = ? WHERE id = ?'
          ).bind(event.transactionHash, 'completed', event.args.workCID).run()
        }
        
        console.log(`Saved redemption: ${event.transactionHash}`)
      }
    } catch (error) {
      console.error(`Failed to process redemption event ${event.transactionHash}:`, error)
    }
  }
  
  // Update last synced block
  await setLastSyncedBlock(env, Number(toBlock))
  
  console.log(`Sync complete. Processed ${purchaseEvents.length} purchases and ${redemptionEvents.length} redemptions`)
}

async function getLastSyncedBlock(env) {
  const value = await env.NONCE_KV.get(SYNC_KEY)
  if (!value) {
    // If no sync has happened, start from deployment block
    return CONTRACT_DEPLOYMENT_BLOCK - 1n // Subtract 1 so we start AT the deployment block
  }
  
  const savedBlock = BigInt(value)
  // Ensure we never go before deployment block
  return savedBlock < CONTRACT_DEPLOYMENT_BLOCK ? CONTRACT_DEPLOYMENT_BLOCK - 1n : savedBlock
}

async function setLastSyncedBlock(env, blockNumber) {
  await env.NONCE_KV.put(SYNC_KEY, blockNumber.toString())
}