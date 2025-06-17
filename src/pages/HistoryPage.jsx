import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TransactionItem } from '../components/TransactionItem';
import { RedemptionRequestItem } from '../components/RedemptionRequestItem';

export function HistoryPage() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        const [purchaseData, redemptionData, requestData] = await Promise.all([
          api.getPurchaseHistory(),
          api.getRedemptionHistory(),
          api.getRedemptionRequests()
        ]);

        setPurchases(purchaseData.purchases || []);
        setRedemptions(redemptionData.redemptions || []);
        setRedemptionRequests(requestData.requests || []);
      } catch (err) {
        console.error('Failed to load history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const activeData = activeTab === 'purchases' 
    ? purchases 
    : activeTab === 'redemptions' 
    ? redemptions 
    : redemptionRequests;

  return (
    <div className="min-h-screen pb-16 bg-black">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-green-400 font-sans">
            <span className="font-mono text-amber-500">[</span> Activity <span className="font-mono text-amber-500">]</span>
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex bg-gray-900 border border-gray-800 rounded p-1 mb-6">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex-1 py-2 px-3 rounded transition-all font-mono text-sm ${
              activeTab === 'purchases'
                ? 'bg-green-400 text-black'
                : 'text-gray-400 hover:text-green-400'
            }`}
          >
            [ PURCHASES ]
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`flex-1 py-2 px-3 rounded transition-all font-mono text-sm ${
              activeTab === 'redemptions'
                ? 'bg-green-400 text-black'
                : 'text-gray-400 hover:text-green-400'
            }`}
          >
            [ REDEMPTIONS ]
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 px-3 rounded transition-all font-mono text-sm ${
              activeTab === 'requests'
                ? 'bg-green-400 text-black'
                : 'text-gray-400 hover:text-green-400'
            }`}
          >
            [ REQUESTS ]
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            <p className="mt-4 text-green-400 font-mono">LOADING HISTORY<span className="terminal-cursor"></span></p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-200 font-mono font-medium">ERROR: Failed to load history</p>
            <p className="text-gray-400 font-mono text-sm mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && activeData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-200 font-mono">
              &gt; No {activeTab} yet
            </p>
            <p className="text-gray-400 font-mono text-sm mt-2">
              Your transaction history will appear here
            </p>
          </div>
        )}

        {!loading && !error && activeData.length > 0 && (
          <div className="space-y-4">
            {activeData.map((item, index) => (
              activeTab === 'requests' ? (
                <RedemptionRequestItem
                  key={item.id || index}
                  request={item}
                />
              ) : (
                <TransactionItem
                  key={item.id || index}
                  transaction={item}
                  type={activeTab === 'purchases' ? 'purchase' : 'redemption'}
                />
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}