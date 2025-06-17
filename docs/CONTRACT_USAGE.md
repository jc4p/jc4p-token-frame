# JC4P Dev-Hour Contract Integration Requirements

This document provides complete technical specifications for integrating with the JC4PDevHours smart contract. It covers all requirements for frontend (Farcaster Frame), backend API, and off-chain services.

## Important: Farcaster Frame Limitations
The Farcaster Frame environment provides a limited `ethProvider` that only supports:
- `eth_requestAccounts` - Get user's wallet address
- `wallet_switchEthereumChain` - Switch networks
- `eth_sendTransaction` - Send transactions
- `eth_signTypedData_v4` - Sign typed data (for permits)
- `eth_call` - Read contract data
- `eth_chainId` - Get current chain ID

All contract interactions must be done through these methods. This guide uses **Viem** for encoding function calls and the Frame SDK's `ethProvider` for execution.

## Table of Contents
1. [Contract Overview](#contract-overview)
2. [Backend API Requirements](#backend-api-requirements)
3. [Frontend Requirements (Farcaster Frame)](#frontend-requirements-farcaster-frame)
4. [Event Monitoring](#event-monitoring)
5. [Error Handling](#error-handling)
6. [Testing Checklist](#testing-checklist)

## Contract Overview

### Deployed Addresses
- **Base Mainnet**: `[TO BE DEPLOYED]`
- **Base Sepolia**: `[TO BE DEPLOYED]`

### Key Constants
```solidity
TOKEN_ID = 0                    // The single token ID for dev hours
BUFFER_BPS = 1000              // 10% buffer (basis points)
BASE_PRICE = 300 * 10^6        // 300 USDC (6 decimals)
DEFAULT_WEEKLY_CAP = 8         // 8 hours per week
```

### USDC Addresses
- **Base Mainnet**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Backend API Requirements

### 1. Voucher Generation Endpoint

**Endpoint**: `GET /api/voucher`

**Query Parameters**:
- `qty` (uint): Number of hours to purchase (1-50)
- `buyer` (address): Ethereum address of the purchaser

**Response**:
```json
{
  "voucher": {
    "buyer": "0x...",      // Must match the requesting address
    "qty": 2,              // Number of hours
    "price": 570000000,    // Total USDC amount (570 USDC for 2 hours at 5% discount)
    "nonce": 0             // Current nonce for this buyer
  },
  "signature": "0x...",    // EIP-712 signature
  "discount": {
    "percentage": 5,       // Discount percentage applied
    "reason": "mutual_follow" // or "likes" or null
  },
  "expiresAt": null       // Vouchers don't expire in this implementation
}
```

### 2. Nonce Tracking

**CRITICAL**: The backend MUST track nonces to prevent replay attacks.

**Endpoint**: `GET /api/nonce/{address}`

**Response**:
```json
{
  "address": "0x...",
  "nonce": 3
}
```

**Implementation**:
1. Query the contract's `getNonce(address)` function
2. Cache the result with a short TTL (30 seconds)
3. After each successful purchase, increment the cached nonce

### 3. Voucher Signing Process

**EIP-712 Domain**:
```javascript
const domain = {
  name: "JC4PDevHours",
  version: "1",
  chainId: 8453, // Base mainnet (or 84532 for Sepolia)
  verifyingContract: "0x..." // Deployed contract address
};

const types = {
  Voucher: [
    { name: "buyer", type: "address" },
    { name: "qty", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};
```

**Signing Code (Node.js)**:
```javascript
const { ethers } = require('ethers');

// Your backend signer
const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);

async function signVoucher(voucher, contractAddress, chainId) {
  const domain = {
    name: "JC4PDevHours",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };

  const types = {
    Voucher: [
      { name: "buyer", type: "address" },
      { name: "qty", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const signature = await signer._signTypedData(domain, types, voucher);
  return signature;
}
```

### 4. Discount Logic Implementation

**Farcaster Integration Required**:
```javascript
async function calculateDiscount(buyerAddress) {
  const farcasterUser = await getFarcasterUserByAddress(buyerAddress);
  if (!farcasterUser) return { percentage: 0, reason: null };

  // Check mutual follow (5% discount)
  const jc4pFid = YOUR_FARCASTER_FID;
  const follows = await checkMutualFollow(farcasterUser.fid, jc4pFid);
  if (follows.mutual) {
    return { percentage: 5, reason: "mutual_follow" };
  }

  // Check likes (10% discount)
  const likeCount = await countLikesFromUser(farcasterUser.fid, jc4pFid);
  if (likeCount >= 10) {
    return { percentage: 10, reason: "likes" };
  }

  return { percentage: 0, reason: null };
}

// Price calculation
function calculatePrice(qty, discountPercentage) {
  const basePrice = 300 * 10**6; // 300 USDC with 6 decimals
  const totalBase = qty * basePrice;
  const discount = (totalBase * discountPercentage) / 100;
  return totalBase - discount;
}
```

### 5. Redemption Webhook

**Listen for `Redeemed` events**:
```javascript
const eventSignature = "Redeemed(address indexed user, uint256 qty, string workCID)";

contract.on("Redeemed", async (user, qty, workCID, event) => {
  // Create work item in your task management system
  await createWorkItem({
    client: user,
    hours: qty.toNumber(),
    description: workCID, // This contains the work request details
    txHash: event.transactionHash,
    blockNumber: event.blockNumber,
    timestamp: new Date()
  });
  
  // Send notification to JC4P
  await notifyDeveloper({
    client: user,
    hours: qty.toNumber(),
    workCID: workCID
  });
});
```

## Frontend Requirements (Farcaster Frame)

### 0. Setup and Imports

```javascript
import * as frame from '@farcaster/frame-sdk';
import { encodeFunctionData, encodeAbiParameters, parseAbiParameters, toHex, keccak256, toBytes } from 'viem';

// When app loads
await frame.sdk.actions.ready();
```

### 1. Purchase Flow

**Step 1: Get User Address**
```javascript
// Get wallet address
const accounts = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_requestAccounts'
});
const userAddress = accounts[0];

// Ensure on Base network
const chainId = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_chainId'
});

if (parseInt(chainId, 16) !== 8453) {
  await frame.sdk.wallet.ethProvider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x2105' }] // Base mainnet
  });
}
```

**Step 2: Request Voucher**
```javascript
const response = await fetch(`/api/voucher?qty=${hours}&buyer=${userAddress}`);
const { voucher, signature, discount } = await response.json();
```

**Step 3: Get USDC Permit Signature**
```javascript
// USDC permit domain
const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: USDC_ADDRESS
};

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

// Get current nonce from USDC contract
const nonceCalldata = encodeFunctionData({
  abi: [{
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }],
  functionName: 'nonces',
  args: [userAddress]
});

const nonceResult = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_call',
  params: [{
    to: USDC_ADDRESS,
    data: nonceCalldata
  }, 'latest']
});

const nonce = parseInt(nonceResult, 16);
const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

const permit = {
  owner: userAddress,
  spender: CONTRACT_ADDRESS,
  value: voucher.price,
  nonce: nonce,
  deadline: deadline
};

// Get permit signature using Frame's signTypedData_v4
const permitSignature = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_signTypedData_v4',
  params: [userAddress, JSON.stringify({
    domain: domain,
    types: types,
    primaryType: 'Permit',
    message: permit
  })]
});

// Split signature
const sig = permitSignature.slice(2);
const r = '0x' + sig.slice(0, 64);
const s = '0x' + sig.slice(64, 128);
const v = parseInt(sig.slice(128, 130), 16);
```

**Step 4: Execute Purchase**
```javascript
// Encode the purchase transaction using viem
const purchaseCalldata = encodeFunctionData({
  abi: [{
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
          { name: 'nonce', type: 'uint256' }
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
  }],
  functionName: 'buyWithVoucherAndPermit',
  args: [
    voucher,
    signature,
    {
      value: voucher.price,
      deadline: deadline,
      v: v,
      r: r,
      s: s
    }
  ]
});

// Send transaction through Frame's ethProvider
const txHash = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: userAddress,
    to: CONTRACT_ADDRESS,
    data: purchaseCalldata,
    value: '0x0' // No ETH sent
  }]
});

console.log('Purchase transaction sent:', txHash);
```

### 2. Display Requirements

**User Balance**:
```javascript
// Encode balanceOf call
const balanceCalldata = encodeFunctionData({
  abi: [{
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }],
  functionName: 'balanceOf',
  args: [userAddress, 0] // Token ID is always 0
});

const balanceResult = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_call',
  params: [{
    to: CONTRACT_ADDRESS,
    data: balanceCalldata
  }, 'latest']
});

const balance = parseInt(balanceResult, 16);
console.log(`User has ${balance} hours`);
```

**Available Supply**:
```javascript
// Encode remainingSupply call
const supplyCalldata = encodeFunctionData({
  abi: [{
    name: 'remainingSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }],
  functionName: 'remainingSupply'
});

const supplyResult = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_call',
  params: [{
    to: CONTRACT_ADDRESS,
    data: supplyCalldata
  }, 'latest']
});

const remainingSupply = parseInt(supplyResult, 16);
console.log(`${remainingSupply} hours available for purchase`);
```

**Weekly Redemption Capacity**:
```javascript
// Encode remainingWeeklyCapacity call
const capacityCalldata = encodeFunctionData({
  abi: [{
    name: 'remainingWeeklyCapacity',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }],
  functionName: 'remainingWeeklyCapacity'
});

const capacityResult = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_call',
  params: [{
    to: CONTRACT_ADDRESS,
    data: capacityCalldata
  }, 'latest']
});

const weeklyCapacity = parseInt(capacityResult, 16);
console.log(`Can redeem ${weeklyCapacity} more hours this week`);
```

### 3. Redemption Flow

**UI Requirements**:
1. Input field for work description/requirements
2. Display current hour balance
3. Show weekly redemption limit and remaining capacity
4. Hour quantity selector (max: min(balance, weeklyRemaining))

**Redemption Transaction**:
```javascript
// workCID can be any string - suggested formats:
// - IPFS hash of work document
// - URL to work specification
// - JSON stringified work details
const workCID = "ipfs://QmWorkSpecificationHash";

// Encode redeem function call
const redeemCalldata = encodeFunctionData({
  abi: [{
    name: 'redeem',
    type: 'function',
    inputs: [
      { name: 'qty', type: 'uint256' },
      { name: 'workCID', type: 'string' }
    ]
  }],
  functionName: 'redeem',
  args: [hoursToRedeem, workCID]
});

// Send redemption transaction
const txHash = await frame.sdk.wallet.ethProvider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: userAddress,
    to: CONTRACT_ADDRESS,
    data: redeemCalldata,
    value: '0x0'
  }]
});

console.log('Redemption transaction sent:', txHash);
```

### 4. Frame Context and User Info

**Get Farcaster User Context**:
```javascript
// Get user context on app load
const context = await frame.sdk.context;
let user = context.user;

// Handle known issue where user might be nested
if (user.user) {
  user = user.user;
}

console.log('Farcaster user:', {
  fid: user.fid,
  username: user.username
});

// Send this info to your API for discount calculation
```

**Network Switching**:
```javascript
// Switch to Base Mainnet
await frame.sdk.wallet.ethProvider.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x2105' }] // 8453 in hex
});

// Switch to Base Sepolia (testnet)
await frame.sdk.wallet.ethProvider.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x14a34' }] // 84532 in hex
});
```

## Event Monitoring

### Events to Monitor

**TokensPurchased**:
```solidity
event TokensPurchased(address indexed buyer, uint256 qty, uint256 price)
```

**Redeemed**:
```solidity
event Redeemed(address indexed user, uint256 qty, string workCID)
```

**SupplyAdded**:
```solidity
event SupplyAdded(uint256 qty)
```

**WeeklyCapUpdated**:
```solidity
event WeeklyCapUpdated(uint256 newCap)
```

### Event Monitoring Setup
```javascript
// Set up event filters
const purchaseFilter = devHours.filters.TokensPurchased();
const redeemFilter = devHours.filters.Redeemed();

// Listen for events
devHours.on(purchaseFilter, (buyer, qty, price, event) => {
  console.log(`${buyer} purchased ${qty} hours for ${price} USDC`);
  // Update UI, analytics, etc.
});

devHours.on(redeemFilter, (user, qty, workCID, event) => {
  console.log(`${user} redeemed ${qty} hours with work: ${workCID}`);
  // Trigger backend webhook
});
```

## Error Handling

### Contract Errors
```solidity
error InvalidSigner();          // Voucher signature invalid
error InvalidNonce();           // Nonce mismatch (replay attempt)
error SupplyCapExceeded();      // No more hours available
error WeeklyCapExceeded();      // Weekly redemption limit hit
error InvalidVoucher();         // Voucher data invalid
error InvalidPermit();          // USDC permit failed
error InsufficientBalance();    // Not enough hours to redeem
error BufferProtection();       // Buffer withdrawal would be too large
error ZeroAddress();            // Invalid address provided
error ZeroAmount();             // Zero quantity not allowed
```

### Frontend Error Messages
```javascript
const errorMessages = {
  "InvalidSigner": "Invalid voucher. Please refresh and try again.",
  "InvalidNonce": "This voucher has already been used. Please request a new one.",
  "SupplyCapExceeded": "Sorry, no more hours are available for purchase.",
  "WeeklyCapExceeded": "Weekly redemption limit reached. Please try again next week.",
  "InvalidVoucher": "Invalid purchase request. Please refresh and try again.",
  "InvalidPermit": "USDC approval failed. Please try again.",
  "InsufficientBalance": "You don't have enough hours for this redemption.",
  "ZeroAmount": "Please select at least 1 hour."
};
```

## Testing Checklist

### Backend Testing
- [ ] Voucher generation with correct nonce tracking
- [ ] Discount calculation based on Farcaster data
- [ ] EIP-712 signature generation
- [ ] Webhook receives and processes Redeemed events
- [ ] Nonce increments after successful purchases

### Frontend Testing
- [ ] Wallet connects to Base network
- [ ] Voucher request includes user address
- [ ] USDC permit signature works
- [ ] Purchase transaction succeeds
- [ ] Balance updates after purchase
- [ ] Redemption with valid work description
- [ ] Error messages display correctly
- [ ] Weekly cap restrictions enforced

### Integration Testing
- [ ] Full purchase flow: voucher → permit → purchase
- [ ] Multiple purchases with increasing nonces
- [ ] Redemption flow with event monitoring
- [ ] Supply cap enforcement
- [ ] Weekly redemption cap rollover

## Security Considerations

1. **Never expose the signer private key** - Keep it secure in backend environment
2. **Validate all inputs** - Check addresses, quantities, and prices
3. **Monitor for unusual activity** - Track redemption patterns
4. **Implement rate limiting** - Prevent voucher spam
5. **Log all transactions** - Maintain audit trail

## Complete Integration Example

### Full Purchase Flow Implementation
```javascript
import * as frame from '@farcaster/frame-sdk';
import { encodeFunctionData, parseAbiParameters, toHex } from 'viem';

class JC4PDevHoursFrame {
  constructor(contractAddress, usdcAddress) {
    this.CONTRACT_ADDRESS = contractAddress;
    this.USDC_ADDRESS = usdcAddress;
  }

  async initialize() {
    // Ready the frame
    await frame.sdk.actions.ready();
    
    // Get user context
    const context = await frame.sdk.context;
    this.user = context.user?.user || context.user;
    
    // Get wallet
    const accounts = await frame.sdk.wallet.ethProvider.request({
      method: 'eth_requestAccounts'
    });
    this.userAddress = accounts[0];
    
    // Ensure on Base
    await this.ensureBaseNetwork();
  }

  async ensureBaseNetwork() {
    const chainId = await frame.sdk.wallet.ethProvider.request({
      method: 'eth_chainId'
    });
    
    if (parseInt(chainId, 16) !== 8453) {
      await frame.sdk.wallet.ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }]
      });
    }
  }

  async purchaseHours(quantity) {
    try {
      // Step 1: Get voucher from API
      const voucherResponse = await fetch('/api/voucher', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        params: new URLSearchParams({
          qty: quantity.toString(),
          buyer: this.userAddress,
          fid: this.user.fid.toString()
        })
      });
      
      const { voucher, signature, discount } = await voucherResponse.json();
      
      // Step 2: Get USDC nonce
      const usdcNonce = await this.getUSDCNonce();
      
      // Step 3: Create permit
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const permitSig = await this.signUSDCPermit(voucher.price, usdcNonce, deadline);
      
      // Step 4: Execute purchase
      const purchaseCalldata = encodeFunctionData({
        abi: [{
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
                { name: 'nonce', type: 'uint256' }
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
        }],
        functionName: 'buyWithVoucherAndPermit',
        args: [voucher, signature, permitSig]
      });

      const txHash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.userAddress,
          to: this.CONTRACT_ADDRESS,
          data: purchaseCalldata,
          value: '0x0'
        }]
      });

      return { success: true, txHash, discount };
    } catch (error) {
      console.error('Purchase failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getUSDCNonce() {
    const calldata = encodeFunctionData({
      abi: [{
        name: 'nonces',
        type: 'function',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }],
      functionName: 'nonces',
      args: [this.userAddress]
    });

    const result = await frame.sdk.wallet.ethProvider.request({
      method: 'eth_call',
      params: [{
        to: this.USDC_ADDRESS,
        data: calldata
      }, 'latest']
    });

    return parseInt(result, 16);
  }

  async signUSDCPermit(value, nonce, deadline) {
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: 8453,
      verifyingContract: this.USDC_ADDRESS
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    const message = {
      owner: this.userAddress,
      spender: this.CONTRACT_ADDRESS,
      value: value,
      nonce: nonce,
      deadline: deadline
    };

    const signature = await frame.sdk.wallet.ethProvider.request({
      method: 'eth_signTypedData_v4',
      params: [this.userAddress, JSON.stringify({
        domain,
        types,
        primaryType: 'Permit',
        message
      })]
    });

    // Parse signature
    const sig = signature.slice(2);
    return {
      value: value,
      deadline: deadline,
      v: parseInt(sig.slice(128, 130), 16),
      r: '0x' + sig.slice(0, 64),
      s: '0x' + sig.slice(64, 128)
    };
  }

  async redeemHours(quantity, workDescription) {
    const calldata = encodeFunctionData({
      abi: [{
        name: 'redeem',
        type: 'function',
        inputs: [
          { name: 'qty', type: 'uint256' },
          { name: 'workCID', type: 'string' }
        ]
      }],
      functionName: 'redeem',
      args: [quantity, workDescription]
    });

    const txHash = await frame.sdk.wallet.ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: this.userAddress,
        to: this.CONTRACT_ADDRESS,
        data: calldata,
        value: '0x0'
      }]
    });

    return txHash;
  }
}

// Usage
const devHours = new JC4PDevHoursFrame(
  '0x...', // Contract address
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
);

await devHours.initialize();
const result = await devHours.purchaseHours(2);
```