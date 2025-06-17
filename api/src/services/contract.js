import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

// Contract ABI fragments we need
const CONTRACT_ABI = parseAbi([
  'function getNonce(address buyer) view returns (uint256)',
  'function nonces(address) view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function remainingSupply() view returns (uint256)',
  'function remainingWeeklyCapacity() view returns (uint256)',
])

export function getPublicClient(env) {
  return createPublicClient({
    chain: base,
    transport: http(env.ALCHEMY_RPC_URL),
  })
}

export async function getContractNonce(env, address) {
  try {
    const client = getPublicClient(env)
    
    const nonce = await client.readContract({
      address: env.CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'nonces',
      args: [address],
    })
    
    return Number(nonce)
  } catch (error) {
    console.error('Error reading nonce from contract:', error)
    // If contract call fails, return 0 as default
    return 0
  }
}

export async function getBalance(env, address) {
  const client = getPublicClient(env)
  
  const balance = await client.readContract({
    address: env.CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: [address, 0n], // Token ID is always 0
  })
  
  return Number(balance)
}

export async function getRemainingSupply(env) {
  const client = getPublicClient(env)
  
  const supply = await client.readContract({
    address: env.CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'remainingSupply',
  })
  
  return Number(supply)
}

export async function getRemainingWeeklyCapacity(env) {
  const client = getPublicClient(env)
  
  const capacity = await client.readContract({
    address: env.CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'remainingWeeklyCapacity',
  })
  
  return Number(capacity)
}