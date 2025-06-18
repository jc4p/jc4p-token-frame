import { frame } from './frame';
import { API_URL } from '../utils/constants';

export async function fetchWithAuth(endpoint, options = {}) {
  try {
    // Get the Quick Auth token
    const { token } = await frame.sdk.quickAuth.getToken();
    
    // Make the request with the token in the Authorization header
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  async getVoucher(qty, buyer) {
    const params = new URLSearchParams({ qty: qty.toString(), buyer });
    const response = await fetchWithAuth(`/api/voucher?${params}`);
    return response.json();
  },

  async getMe() {
    const response = await fetchWithAuth('/api/me');
    return response.json();
  },

  async getNonce(address) {
    const response = await fetchWithAuth(`/api/nonce/${address}`);
    return response.json();
  },

  async getPurchaseHistory(limit = 10, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await fetchWithAuth(`/api/history/purchases?${params}`);
    return response.json();
  },

  async getRedemptionHistory(limit = 10, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await fetchWithAuth(`/api/history/redemptions?${params}`);
    return response.json();
  },

  async getGlobalHistory(limit = 20, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await fetchWithAuth(`/api/history/global?${params}`);
    return response.json();
  },

  async createRedemptionRequest(qty, requestContent) {
    const response = await fetchWithAuth('/api/redemption/request', {
      method: 'POST',
      body: JSON.stringify({ qty, requestContent })
    });
    return response.json();
  },

  async getRedemptionRequest(requestId) {
    const response = await fetchWithAuth(`/api/redemption/request/${requestId}`);
    return response.json();
  },

  async getRedemptionRequests(limit = 10, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await fetchWithAuth(`/api/redemption/requests?${params}`);
    return response.json();
  },

  async getContractInfo() {
    const response = await fetchWithAuth('/api/contract/info');
    return response.json();
  },

  async getContractDomain() {
    const response = await fetchWithAuth('/api/contract/domain');
    return response.json();
  },

  async rpcCall(method, params) {
    const response = await fetch(`${API_URL}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: 1
      })
    });
    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  },

  async verifyTransaction(txHash) {
    const response = await fetchWithAuth('/api/transaction/verify', {
      method: 'POST',
      body: JSON.stringify({ txHash })
    });
    return response.json();
  },

  async getTransaction(txHash) {
    const response = await fetchWithAuth(`/api/transaction/${txHash}`);
    return response.json();
  }
};