import { encodeFunctionData, decodeFunctionResult } from 'viem';
import { frame } from './frame';
import { api } from './api';
import { CONTRACT_ADDRESS, USDC_ADDRESS, BASE_CHAINID, BASE_CHAINID_HEX, TOKEN_ID } from '../utils/constants';

// Contract ABIs
const contractABI = {
  balanceOf: {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  remainingSupply: {
    name: 'remainingSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  remainingWeeklyCapacity: {
    name: 'remainingWeeklyCapacity',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  buyWithVoucherAndPermit: {
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
  },
  redeem: {
    name: 'redeem',
    type: 'function',
    inputs: [
      { name: 'qty', type: 'uint256' },
      { name: 'workCID', type: 'string' }
    ]
  }
};

const usdcABI = {
  nonces: {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
};

export async function ensureBaseNetwork() {
  const chainId = await frame.sdk.wallet.ethProvider.request({
    method: 'eth_chainId'
  });
  
  if (parseInt(chainId, 16) !== BASE_CHAINID) {
    await frame.sdk.wallet.ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAINID_HEX }]
    });
  }
}

export async function getUserAddress() {
  const accounts = await frame.sdk.wallet.ethProvider.request({
    method: 'eth_requestAccounts'
  });
  return accounts[0];
}

export async function getBalance(userAddress) {
  const calldata = encodeFunctionData({
    abi: [contractABI.balanceOf],
    functionName: 'balanceOf',
    args: [userAddress, TOKEN_ID]
  });

  const result = await api.rpcCall('eth_call', [{
    to: CONTRACT_ADDRESS,
    data: calldata
  }, 'latest']);

  return parseInt(result, 16);
}

export async function getRemainingSupply() {
  const calldata = encodeFunctionData({
    abi: [contractABI.remainingSupply],
    functionName: 'remainingSupply'
  });

  const result = await api.rpcCall('eth_call', [{
    to: CONTRACT_ADDRESS,
    data: calldata
  }, 'latest']);

  return parseInt(result, 16);
}

export async function getRemainingWeeklyCapacity() {
  const calldata = encodeFunctionData({
    abi: [contractABI.remainingWeeklyCapacity],
    functionName: 'remainingWeeklyCapacity'
  });

  const result = await api.rpcCall('eth_call', [{
    to: CONTRACT_ADDRESS,
    data: calldata
  }, 'latest']);

  return parseInt(result, 16);
}

export async function getUSDCNonce(userAddress) {
  const calldata = encodeFunctionData({
    abi: [usdcABI.nonces],
    functionName: 'nonces',
    args: [userAddress]
  });

  const result = await api.rpcCall('eth_call', [{
    to: USDC_ADDRESS,
    data: calldata
  }, 'latest']);

  return parseInt(result, 16);
}

export async function signUSDCPermit(userAddress, value, nonce, deadline) {
  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: BASE_CHAINID,
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

  const message = {
    owner: userAddress,
    spender: CONTRACT_ADDRESS,
    value: value,
    nonce: nonce,
    deadline: deadline
  };

  const signature = await frame.sdk.wallet.ethProvider.request({
    method: 'eth_signTypedData_v4',
    params: [userAddress, JSON.stringify({
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

export async function purchaseHours(voucher, signature, permitSig) {
  // Ensure all numeric values are BigInt for proper encoding
  const voucherForContract = {
    buyer: voucher.buyer,
    qty: BigInt(voucher.qty),
    price: BigInt(voucher.price),
    nonce: BigInt(voucher.nonce),
    fid: BigInt(voucher.fid)
  };
  
  const permitForContract = {
    value: BigInt(permitSig.value),
    deadline: BigInt(permitSig.deadline),
    v: permitSig.v,
    r: permitSig.r,
    s: permitSig.s
  };
  
  const calldata = encodeFunctionData({
    abi: [contractABI.buyWithVoucherAndPermit],
    functionName: 'buyWithVoucherAndPermit',
    args: [voucherForContract, signature, permitForContract]
  });

  const txHash = await frame.sdk.wallet.ethProvider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: voucher.buyer,
      to: CONTRACT_ADDRESS,
      data: calldata,
      value: '0x0'
    }]
  });

  return txHash;
}

export async function redeemHours(quantity, workDescription) {
  const userAddress = await getUserAddress();
  
  const calldata = encodeFunctionData({
    abi: [contractABI.redeem],
    functionName: 'redeem',
    args: [quantity, workDescription]
  });

  const txHash = await frame.sdk.wallet.ethProvider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: userAddress,
      to: CONTRACT_ADDRESS,
      data: calldata,
      value: '0x0'
    }]
  });

  return txHash;
}