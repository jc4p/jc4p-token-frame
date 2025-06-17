import { encodeFunctionData, decodeAbiParameters } from 'viem'

// The voucher from your message
const voucher = {
  buyer: "0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7",
  qty: 1,
  price: 100000000,
  nonce: 0,
  fid: 977233
}

// Contract ABI
const buyWithVoucherAndPermit = {
  name: 'buyWithVoucherAndPermit',
  type: 'function',
  inputs: [
    {
      name: 'v',
      type: 'tuple',
      components: [
        { name: 'buyer', type: 'address' },
        { name: 'qty', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'fid', type: 'uint256' }
      ]
    },
    { name: 'vSig', type: 'bytes' },
    {
      name: 'p',
      type: 'tuple',
      components: [
        { name: 'value', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'v', type: 'uint8' },
        { name: 'r', type: 'bytes32' },
        { name: 's', type: 'bytes32' }
      ]
    }
  ]
}

// Mock permit signature
const permitSig = {
  value: 100000000, // Should match voucher price
  deadline: Math.floor(Date.now() / 1000) + 3600,
  v: 27,
  r: '0x' + '0'.repeat(64),
  s: '0x' + '0'.repeat(64)
}

console.log('=== Transaction Debug ===\n')
console.log('Voucher:')
console.log('- Buyer:', voucher.buyer)
console.log('- Quantity:', voucher.qty)
console.log('- Price:', voucher.price, '(', voucher.price / 1e6, 'USDC)')
console.log('- Nonce:', voucher.nonce)
console.log('- FID:', voucher.fid)

console.log('\nPermit:')
console.log('- Value:', permitSig.value, '(', permitSig.value / 1e6, 'USDC)')
console.log('- Match:', permitSig.value === voucher.price)

// Check if values are being passed correctly
console.log('\n=== Type Checks ===')
console.log('Voucher price type:', typeof voucher.price)
console.log('Voucher price value:', voucher.price)
console.log('As BigInt:', BigInt(voucher.price).toString())

// The contract expects the USDC transfer to be for voucher.price
// If wallet shows 10 USDC instead of 100 USDC, check:
console.log('\n=== Possible Issues ===')
console.log('1. Is the frontend passing voucher.price / 10 somewhere?')
console.log('2. Is there a decimal conversion error?')
console.log('3. Check if permitSig.value is being divided by 10')

// What 10 USDC would be
console.log('\n10 USDC in wei:', 10_000_000)
console.log('100 USDC in wei:', 100_000_000)
console.log('Voucher price:', voucher.price)