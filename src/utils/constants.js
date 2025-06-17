export const CONTRACT_ADDRESS = '0xf20b196c483385badf308a5ce1be2492c95ab166'
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base mainnet
export const BASE_CHAINID = 8453
export const BASE_CHAINID_HEX = '0x2105'

export const API_URL = 'https://jc4p-token-api.kasra.codes'

export const TOKEN_ID = 0
export const BASE_PRICE = 300 * 10**6 // 300 USDC with 6 decimals
export const DEFAULT_WEEKLY_CAP = 16

export const ERROR_MESSAGES = {
  "InvalidSigner": "Invalid voucher. Please refresh and try again.",
  "InvalidNonce": "This voucher has already been used. Please request a new one.",
  "SupplyCapExceeded": "Sorry, no more hours are available for purchase.",
  "WeeklyCapExceeded": "Weekly redemption limit reached. Please try again next week.",
  "InvalidVoucher": "Invalid purchase request. Please refresh and try again.",
  "InvalidPermit": "USDC approval failed. Please try again.",
  "InsufficientBalance": "You don't have enough hours for this redemption.",
  "ZeroAmount": "Please select at least 1 hour."
};