import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .dev.vars
config({ path: resolve(process.cwd(), '.dev.vars') })

const AUCTION_CONTRACT = '0xB1e0d6ADdc6562bc9d8F7014374DA79535495Ff9'

// BidPlaced event ABI
const bidPlacedEvent = parseAbiItem('event BidPlaced(address indexed bidder, uint256 amount, uint64 fid)')

async function findAuctionBidders() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.ALCHEMY_RPC_URL)
  })
  
  console.log('Fetching BidPlaced events from auction contract...')
  
  try {
    // Get all BidPlaced events
    const logs = await client.getLogs({
      address: AUCTION_CONTRACT,
      event: bidPlacedEvent,
      fromBlock: 0n,
      toBlock: 'latest'
    })
    
    console.log(`Found ${logs.length} bid events`)
    
    // Extract unique FIDs
    const fidSet = new Set()
    const bidderDetails = []
    
    for (const log of logs) {
      const { bidder, amount, fid } = log.args
      fidSet.add(Number(fid))
      bidderDetails.push({
        bidder: bidder,
        fid: Number(fid),
        amount: (Number(amount) / 1e18).toFixed(4),
        txHash: log.transactionHash,
        block: log.blockNumber
      })
    }
    
    // Sort FIDs numerically
    const uniqueFids = Array.from(fidSet).sort((a, b) => a - b)
    
    console.log('\n=== UNIQUE BIDDER FIDs ===')
    console.log(`Total unique bidders: ${uniqueFids.length}`)
    console.log('\nFID List:')
    console.log(JSON.stringify(uniqueFids))
    
    // Generate code snippet for the hardcoded list
    console.log('\n=== CODE SNIPPET ===')
    console.log('// OG Auction Bidder FIDs from contract 0xB1e0d6ADdc6562bc9d8F7014374DA79535495Ff9')
    console.log(`const OG_AUCTION_BIDDER_FIDS = [${uniqueFids.join(', ')}]`)
    
    // Show some bid details
    console.log('\n=== SAMPLE BID DETAILS (first 10) ===')
    bidderDetails.slice(0, 10).forEach(bid => {
      console.log(`FID ${bid.fid}: ${bid.bidder} bid ${bid.amount} ETH (tx: ${bid.txHash})`)
    })
    
    // Summary statistics
    const totalBids = bidderDetails.reduce((sum, bid) => sum + parseFloat(bid.amount), 0)
    console.log('\n=== SUMMARY ===')
    console.log(`Total bids: ${logs.length}`)
    console.log(`Unique bidders: ${uniqueFids.length}`)
    console.log(`Total ETH bid: ${totalBids.toFixed(4)} ETH`)
    
  } catch (error) {
    console.error('Error fetching events:', error)
    process.exit(1)
  }
}

// Run the script
findAuctionBidders().catch(console.error)