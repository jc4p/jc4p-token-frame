// Helper script to decode contract revert reasons
// You can add this to your frontend to get better error messages

import { decodeErrorResult, parseAbi } from 'viem'

// Common contract errors
const contractErrors = parseAbi([
  'error InvalidSignature()',
  'error InvalidNonce()',
  'error InvalidQuantity()',
  'error InsufficientPayment()',
  'error TransferFailed()',
  'error InvalidBuyer()',
  'error InvalidPrice()'
])

export function decodeContractError(error) {
  try {
    // Extract the error data from the error object
    const errorData = error?.data?.data || error?.data || error?.message
    
    if (!errorData || typeof errorData !== 'string') {
      return 'Unknown error'
    }
    
    // Try to decode using known error signatures
    const decodedError = decodeErrorResult({
      abi: contractErrors,
      data: errorData
    })
    
    // Map error names to user-friendly messages
    const errorMessages = {
      'InvalidSignature': 'The voucher signature is invalid. Please generate a new voucher.',
      'InvalidNonce': 'The voucher has already been used or is outdated. Please generate a new voucher.',
      'InvalidQuantity': 'Invalid quantity specified.',
      'InsufficientPayment': 'Insufficient USDC balance or allowance.',
      'TransferFailed': 'USDC transfer failed. Please check your balance and allowance.',
      'InvalidBuyer': 'The voucher buyer address does not match the transaction sender.',
      'InvalidPrice': 'The voucher price does not match the expected amount.'
    }
    
    return errorMessages[decodedError.errorName] || `Contract error: ${decodedError.errorName}`
  } catch (e) {
    // If we can't decode, return the raw error
    return error?.message || 'Transaction failed'
  }
}

// Example usage in your frontend:
/*
try {
  const tx = await contract.buy(voucher.buyer, voucher.qty, voucher.price, voucher.nonce, signature)
  await tx.wait()
} catch (error) {
  const friendlyError = decodeContractError(error)
  console.error('Transaction failed:', friendlyError)
  // Show friendlyError to the user
}
*/