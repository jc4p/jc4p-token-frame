import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserAddress, ensureBaseNetwork } from '../lib/contract';
import { api } from '../lib/api';

const ContractContext = createContext();

export function ContractProvider({ children }) {
  const [data, setData] = useState({
    userAddress: null,
    balance: 0,
    remainingSupply: 0,
    weeklyCapacity: 0,
    loading: true,
    error: null,
  });

  const loadContractData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Ensure we're on the correct network
      await ensureBaseNetwork();

      // Get user address
      const address = await getUserAddress();

      // Get all contract info in a single call
      const contractInfo = await api.getContractInfo();

      setData({
        userAddress: address,
        balance: contractInfo.user.balance,
        remainingSupply: contractInfo.supply.remaining,
        weeklyCapacity: contractInfo.supply.weeklyCapacity,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to load contract data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  const value = {
    ...data,
    refresh: loadContractData,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContractData() {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContractData must be used within ContractProvider');
  }
  return context;
}