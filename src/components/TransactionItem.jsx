export function TransactionItem({ transaction, type }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatUSDC = (amount) => {
    return (amount / 10**6).toFixed(2);
  };

  return (
    <div className="bg-gray-900 rounded p-4 border border-gray-800">
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm text-amber-500 font-mono">
          {formatDate(transaction.timestamp)}
        </div>
        {transaction.status && (
          <span className={`text-xs px-2 py-1 rounded font-mono ${
            transaction.status === 'completed' 
              ? 'bg-green-400 text-black'
              : transaction.status === 'in_progress'
              ? 'bg-amber-500 text-black'
              : 'bg-gray-700 text-gray-300'
          }`}>
            [{transaction.status.replace('_', ' ').toUpperCase()}]
          </span>
        )}
      </div>
      
      <div className="font-medium text-gray-200 font-mono">
        {type === 'purchase' ? (
          <>
            &gt; Purchased {transaction.qty} hour{transaction.qty !== 1 ? 's' : ''}
          </>
        ) : (
          <>
            &gt; Redeemed {transaction.qty} hour{transaction.qty !== 1 ? 's' : ''}
          </>
        )}
      </div>
      
      {type === 'purchase' && transaction.price && (
        <div className="text-sm text-gray-400 mt-1 font-mono">
          COST: {formatUSDC(transaction.price)} USDC
          {transaction.discount && transaction.discount > 0 && (
            <span className="text-green-400 ml-1">
              (DISCOUNT: {transaction.discount}%)
            </span>
          )}
        </div>
      )}
      
      {type === 'redemption' && transaction.description && (
        <div className="text-sm text-gray-400 mt-2 font-mono italic">
          // {transaction.description}
        </div>
      )}
      
      {transaction.txHash && (
        <div className="text-xs text-gray-500 mt-2 truncate font-mono">
          TX: {transaction.txHash}
        </div>
      )}
    </div>
  );
}