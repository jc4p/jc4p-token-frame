import { useContractData } from '../contexts/ContractContext';
import { RedeemForm } from '../components/RedeemForm';
import { DEFAULT_WEEKLY_CAP } from '../utils/constants';

export function RedeemPage() {
  const { balance, weeklyCapacity, loading, error, refresh } = useContractData();

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

  const weeklyUsed = DEFAULT_WEEKLY_CAP - weeklyCapacity;

  return (
    <div className="min-h-screen pb-16 bg-black">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-green-400 font-sans">
            <span className="font-mono text-amber-500">[</span> Redeem Hours <span className="font-mono text-amber-500">]</span>
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Balance Info */}
        <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-3 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-amber-500">BALANCE:</span>
            <span className="text-green-400 font-semibold">{balance} hours</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-amber-500">WEEKLY_LIMIT:</span>
            <span className="text-gray-200">{weeklyUsed}/{DEFAULT_WEEKLY_CAP} used</span>
          </div>
          {weeklyCapacity > 0 && (
            <div className="text-sm text-green-400">
              &gt; You can redeem up to {weeklyCapacity} more hours this week
            </div>
          )}
          {weeklyCapacity === 0 && (
            <div className="text-sm text-red-500">
              &gt; Weekly redemption limit reached. Resets next week.
            </div>
          )}
        </div>

        {/* Redemption Form */}
        <div className="bg-gray-900 border border-gray-800 rounded p-6">
          <RedeemForm 
            balance={balance} 
            weeklyCapacity={weeklyCapacity}
            onRedeemComplete={refresh}
          />
        </div>
      </main>
    </div>
  );
}