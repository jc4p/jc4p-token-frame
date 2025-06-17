import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.dev.vars') })

const CONTRACT_ADDRESS = '0xf20b196c483385badf308a5ce1be2492c95ab166'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Contract ABI based on the actual contract
const contractABI = parseAbi([
  'function buyWithVoucherAndPermit((address buyer, uint256 qty, uint256 price, uint256 nonce, uint256 fid) v, bytes vSig, (uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) p) external',
  'function trustedSigner() external view returns (address)',
  'function nonces(address) external view returns (uint256)',
  'function getNonce(address buyer) external view returns (uint256)',
  'function supplyCap() external view returns (uint256)',
  'function sold() external view returns (uint256)',
  'function remainingSupply() external view returns (uint256)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)'
])

const usdcABI = parseAbi([
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
])

// Test voucher data
const voucher = {
  buyer: "0x0db12c0a67bc5b8942ea3126a465d7a0b23126c7",
  qty: 1,
  price: 30000000,
  nonce: 4,
  fid: 977233 // Your FID
}
const signature = "0x1a7f03a5a326a924cbbfca571ed5bc2fe0ff7caf194328a450009028a40b97176d4cd60536546a4c96a08e6a5c0d1c8bbff4a684723bf8d99411c54878447eff1b"

async function testVoucher() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.ALCHEMY_RPC_URL)
  })

  console.log('Testing voucher verification...\n')
  console.log('Voucher:', JSON.stringify(voucher, null, 2))
  console.log('Signature:', signature)
  console.log('\n=== Contract Checks ===')

  try {
    // 1. Check trusted signer
    const trustedSigner = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'trustedSigner'
    })
    console.log('Contract trusted signer:', trustedSigner)
    console.log('Expected signer address:', process.env.SIGNER_ADDRESS)
    console.log('Signer match:', trustedSigner.toLowerCase() === process.env.SIGNER_ADDRESS?.toLowerCase())

    // 2. Check current nonce
    const currentNonce = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'nonces',
      args: [voucher.buyer]
    })
    console.log('\nBuyer nonce on contract:', Number(currentNonce))
    console.log('Voucher nonce:', voucher.nonce)
    console.log('Nonce match:', Number(currentNonce) === voucher.nonce)

    // 3. Check supply
    const supplyCap = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'supplyCap'
    })
    const sold = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'sold'
    })
    const remaining = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'remainingSupply'
    })
    console.log('\n=== Supply Info ===')
    console.log('Supply cap:', Number(supplyCap))
    console.log('Already sold:', Number(sold))
    console.log('Remaining supply:', Number(remaining))
    console.log('Can purchase:', Number(remaining) >= voucher.qty)

    // 4. Check buyer's token balance
    const tokenBalance = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'balanceOf',
      args: [voucher.buyer, 0] // TOKEN_ID is 0
    })
    console.log('\nBuyer current token balance:', Number(tokenBalance))

    // 5. Check USDC balance and allowance
    console.log('\n=== USDC Checks ===')
    const usdcBalance = await client.readContract({
      address: USDC_ADDRESS,
      abi: usdcABI,
      functionName: 'balanceOf',
      args: [voucher.buyer]
    })
    console.log('Buyer USDC balance:', Number(usdcBalance) / 1e6, 'USDC')
    console.log('Required amount:', voucher.price / 1e6, 'USDC')
    console.log('Sufficient balance:', Number(usdcBalance) >= voucher.price)

    const allowance = await client.readContract({
      address: USDC_ADDRESS,
      abi: usdcABI,
      functionName: 'allowance',
      args: [voucher.buyer, CONTRACT_ADDRESS]
    })
    console.log('\nUSDC allowance:', Number(allowance) / 1e6, 'USDC')
    console.log('Sufficient allowance:', Number(allowance) >= voucher.price)

    console.log('\n=== IMPORTANT ===')
    console.log('The contract requires a USDC permit signature along with the voucher.')
    console.log('The frontend needs to:')
    console.log('1. Get USDC permit signature from the user')
    console.log('2. Call buyWithVoucherAndPermit with both voucher and permit data')
    console.log('\nThe standard USDC approve/transferFrom flow is NOT used by this contract.')

  } catch (error) {
    console.error('Error during testing:', error)
  }
}

// Run the test
testVoucher().catch(console.error)