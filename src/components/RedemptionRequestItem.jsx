export function RedemptionRequestItem({ request }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500 text-black';
      case 'redeemed':
        return 'bg-green-400 text-black';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="bg-gray-900 rounded p-4 border border-gray-800">
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm text-amber-500 font-mono">
          {formatDate(request.created_at || request.timestamp)}
        </div>
        <span className={`text-xs px-2 py-1 rounded font-mono ${getStatusColor(request.status)}`}>
          [{request.status?.toUpperCase() || 'PENDING'}]
        </span>
      </div>
      
      <div className="font-medium text-gray-200 font-mono mb-2">
        &gt; Request for {request.qty} hour{request.qty !== 1 ? 's' : ''}
      </div>
      
      <div className="text-sm text-gray-400 font-mono mb-2">
        // {request.requestContent || request.content}
      </div>
      
      {request.requestId && (
        <div className="text-xs text-gray-500 font-mono">
          ID: {request.requestId}
        </div>
      )}
      
      {request.txHash && (
        <div className="text-xs text-gray-500 mt-1 truncate font-mono">
          TX: {request.txHash}
        </div>
      )}
    </div>
  );
}