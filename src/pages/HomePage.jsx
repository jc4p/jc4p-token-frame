import { useState, useEffect } from 'react';
import { useContractData } from '../contexts/ContractContext';
import { PurchaseCard } from '../components/PurchaseCard';
import { HowItWorksModal } from '../components/HowItWorksModal';
import { RecentActivity } from '../components/RecentActivity';
import { DEFAULT_WEEKLY_CAP } from '../utils/constants';
import { api } from '../lib/api';
import { getUserAddress } from '../lib/contract';

export function HomePage() {
  const { remainingSupply, weeklyCapacity, loading, error, refresh } = useContractData();
  const [discount, setDiscount] = useState(null);
  const [checkingDiscount, setCheckingDiscount] = useState(true);

  // Check for discount when component mounts
  useEffect(() => {
    async function checkDiscount() {
      try {
        setCheckingDiscount(true);
        const userAddress = await getUserAddress();
        
        // Make a voucher request with qty=1 just to check discount
        const voucherData = await api.getVoucher(1, userAddress);
        if (voucherData.discount && voucherData.discount.percentage > 0) {
          setDiscount(voucherData.discount);
        }
      } catch (err) {
        console.error('Failed to check discount:', err);
        // Don't show error, just proceed without discount
      } finally {
        setCheckingDiscount(false);
      }
    }

    if (!loading && !error) {
      checkDiscount();
    }
  }, [loading, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16 bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-green-400 font-mono">LOADING<span className="terminal-cursor"></span></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16 bg-black">
        <div className="text-center p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-200 font-mono font-medium">ERROR: Failed to load contract data</p>
          <p className="text-gray-400 font-mono text-sm mt-2">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-6 py-2 bg-gray-900 border border-green-400 text-green-400 font-mono rounded hover:bg-green-400 hover:text-black transition-colors"
          >
            [ RETRY ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-black relative">
      {/* Discount Badge - Fixed to top right */}
      {!checkingDiscount && discount && discount.percentage > 0 && (
        <div className="fixed top-4 right-4 bg-green-400 text-black px-3 py-1 rounded font-bold text-sm animate-pulse z-50">
          {discount.percentage}% OFF - {discount.reason}
        </div>
      )}
      
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-green-400 font-sans">
            <span className="font-mono text-amber-500">[</span> DEV HELP FROM JC4P <span className="font-mono text-amber-500">]</span>
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Terminal Status */}
        <div className="bg-gray-900 border border-gray-800 rounded p-4 font-mono text-sm">
          <div className="text-gray-500">$ system.status</div>
          <div className="mt-2 text-gray-200">
            <span className="text-amber-500">AVAILABLE_THIS_WEEK:</span> {weeklyCapacity} hours
          </div>
          <div className="text-gray-200">
            <span className="text-amber-500">TOTAL_SUPPLY:</span> {remainingSupply} hours
          </div>
        </div>

        {/* Value Proposition */}
        <div className="text-left py-4 space-y-2">
          <p className="text-gray-300 font-mono">
            &gt; Immediate direct access to @jc4p for consulting, one-on-one training, MVP development, data analysis, whatever you want (unless it's illegal in USA)
          </p>
          <HowItWorksModal />
        </div>

        {/* Purchase Card */}
        <PurchaseCard 
          onPurchaseComplete={refresh} 
          remainingSupply={remainingSupply} 
          discount={discount}
          checkingDiscount={checkingDiscount}
        />

        {/* Recent Activity */}
        <RecentActivity />

        {/* Terminal Footer */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 font-mono">
            <span className="terminal-cursor">Ready to execute purchase</span>
          </p>
        </div>
      </main>
    </div>
  );
}