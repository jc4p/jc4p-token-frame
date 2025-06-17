import { verifyTypedData } from 'viem'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.dev.vars') })

// Test voucher
const voucher = {
  buyer: "0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7",
  qty: 1,
  price: 30000000,
  nonce: 0,
  fid: 977233
}

const signature = "0x2f708aa936ae74154dbb8536f5da09560dbd51a47799ddc11a0733af4b3b979e5896bb1d2df2522f2dcb63ed25e336c47987c3318b48bf80b050ac11fd64ee251c"

// EIP-712 domain
const domain = {
  name: 'JC4PDevHours',
  version: '1',
  chainId: 8453,
  verifyingContract: '0xf20b196c483385badf308a5ce1be2492c95ab166'
}

const types = {
  Voucher: [
    { name: 'buyer', type: 'address' },
    { name: 'qty', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'fid', type: 'uint256' }
  ]
}

async function verifyVoucher() {
  console.log('=== Verifying Voucher Signature ===\n')
  console.log('Voucher:', JSON.stringify(voucher, null, 2))
  console.log('\nSignature:', signature)
  const SIGNER_ADDRESS = '0xD084221eC800eD783DC28e4c8A8f836F1f3626b8'
  console.log('\nExpected signer:', SIGNER_ADDRESS)
  
  try {
    // Verify the signature
    const isValid = await verifyTypedData({
      address: SIGNER_ADDRESS,
      domain,
      types,
      primaryType: 'Voucher',
      message: {
        buyer: voucher.buyer,
        qty: BigInt(voucher.qty),
        price: BigInt(voucher.price),
        nonce: BigInt(voucher.nonce),
        fid: BigInt(voucher.fid)
      },
      signature
    })
    
    console.log('\nSignature verification result:', isValid)
    
    // Check price validation
    const MIN_PRICE_PER_HOUR = 100_000_000 // 100 USDC
    const minRequired = voucher.qty * MIN_PRICE_PER_HOUR
    console.log('\n=== Price Validation ===')
    console.log('Voucher price:', voucher.price / 1e6, 'USDC')
    console.log('Minimum required:', minRequired / 1e6, 'USDC')
    console.log('Price valid:', voucher.price >= minRequired)
    
    if (voucher.price < minRequired) {
      console.log('\n❌ PRICE TOO LOW! This will cause InvalidVoucher error')
      console.log('The contract requires minimum 100 USDC per hour')
    }
    
  } catch (error) {
    console.error('\nSignature verification failed:', error.message)
  }
}

verifyVoucher().catch(console.error)