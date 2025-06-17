import { createPublicClient, createWalletClient, http, parseAbi, encodeFunctionData, decodeFunctionResult } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.dev.vars') })

const CONTRACT_ADDRESS = '0xf20b196c483385badf308a5ce1be2492c95ab166'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Contract ABI for the functions we need
const contractABI = parseAbi([
  'function buy(address buyer, uint256 qty, uint256 price, uint256 nonce, bytes signature) external',
  'function verifyVoucher(address buyer, uint256 qty, uint256 price, uint256 nonce, bytes signature) external view returns (bool)',
  'function signerAddress() external view returns (address)',
  'function nonces(address) external view returns (uint256)'
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
  nonce: 4
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
    // 1. Check signer address
    const signerAddress = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'signerAddress'
    })
    console.log('Contract signer address:', signerAddress)
    console.log('Expected signer address:', process.env.SIGNER_ADDRESS)
    console.log('Signer match:', signerAddress.toLowerCase() === process.env.SIGNER_ADDRESS?.toLowerCase())

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

    // 3. Verify voucher signature
    try {
      const isValid = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: 'verifyVoucher',
        args: [voucher.buyer, BigInt(voucher.qty), BigInt(voucher.price), BigInt(voucher.nonce), signature]
      })
      console.log('\nVoucher verification result:', isValid)
    } catch (error) {
      console.log('\nVoucher verification failed:', error.message)
    }

    // 4. Check USDC balance and allowance
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

    // 5. Try to simulate the buy transaction
    console.log('\n=== Simulating Buy Transaction ===')
    try {
      const { request } = await client.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: 'buy',
        args: [voucher.buyer, BigInt(voucher.qty), BigInt(voucher.price), BigInt(voucher.nonce), signature],
        account: voucher.buyer
      })
      console.log('Simulation successful! Transaction would succeed.')
    } catch (error) {
      console.log('Simulation failed with error:')
      console.log('Error:', error.message)
      if (error.cause) {
        console.log('Cause:', error.cause.reason || error.cause.message)
      }
    }

  } catch (error) {
    console.error('Error during testing:', error)
  }
}

// Run the test
testVoucher().catch(console.error)