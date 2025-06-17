import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

// EIP-712 domain and types for voucher signing
const DOMAIN = {
  name: 'JC4PDevHours',
  version: '1',
}

const VOUCHER_TYPES = {
  Voucher: [
    { name: 'buyer', type: 'address' },
    { name: 'qty', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'fid', type: 'uint256' },
  ],
}

export function getSigner(env) {
  return privateKeyToAccount(env.SIGNER_PRIVATE_KEY)
}

export async function signVoucher(env, voucher) {
  const signer = getSigner(env)
  const chainId = parseInt(env.CHAIN_ID)
  
  const domain = {
    ...DOMAIN,
    chainId,
    verifyingContract: env.CONTRACT_ADDRESS,
  }
  
  const signature = await signer.signTypedData({
    domain,
    types: VOUCHER_TYPES,
    primaryType: 'Voucher',
    message: {
      buyer: voucher.buyer,
      qty: BigInt(voucher.qty),
      price: BigInt(voucher.price),
      nonce: BigInt(voucher.nonce),
      fid: BigInt(voucher.fid || 0),
    },
  })
  
  return signature
}

export function calculatePrice(qty, discountPercentage = 0) {
  const BASE_PRICE = 300_000_000 // 300 USDC with 6 decimals
  const MIN_PRICE_PER_HOUR = 100_000_000 // 100 USDC minimum per hour (contract requirement)
  
  const totalBase = qty * BASE_PRICE
  const discount = Math.floor((totalBase * discountPercentage) / 100)
  const discountedPrice = totalBase - discount
  
  // Ensure price never goes below contract minimum
  const minRequired = qty * MIN_PRICE_PER_HOUR
  return Math.max(discountedPrice, minRequired)
}