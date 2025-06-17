import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.dev.vars') })

const CONTRACT_ADDRESS = '0xf20b196c483385badf308a5ce1be2492c95ab166'

// Contract ABI
const contractABI = parseAbi([
  'function nonces(address) external view returns (uint256)',
  'function getNonce(address buyer) external view returns (uint256)'
])

async function debugVoucher() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.ALCHEMY_RPC_URL)
  })

  // The address from your error
  const buyerAddress = "0x0db12c0a67bc5b8942ea3126a465d7a0b23126c7"
  
  console.log('=== Debugging InvalidVoucher Error ===\n')
  console.log('Buyer address:', buyerAddress)
  
  try {
    // Check nonce using both methods
    const nonce1 = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'nonces',
      args: [buyerAddress]
    })
    
    const nonce2 = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'getNonce',
      args: [buyerAddress]
    })
    
    console.log('\nContract nonces:')
    console.log('nonces():', Number(nonce1))
    console.log('getNonce():', Number(nonce2))
    
    console.log('\n=== Possible InvalidVoucher causes ===')
    console.log('1. Nonce mismatch - Make sure voucher.nonce matches contract nonce')
    console.log('2. Buyer address mismatch - Ensure tx is sent from same address as voucher.buyer')
    console.log('3. Price too low - Must be >= qty * 100 USDC (100000000 wei)')
    console.log('4. Quantity is 0')
    console.log('5. FID field missing from voucher struct')
    
    console.log('\n=== Next Steps ===')
    console.log('1. Generate a fresh voucher with the correct nonce')
    console.log('2. Ensure the transaction sender matches voucher.buyer')
    console.log('3. Check that voucher includes all 5 fields: buyer, qty, price, nonce, fid')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugVoucher().catch(console.error)