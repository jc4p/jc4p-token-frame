import { useState } from 'react';
import { redeemHours } from '../lib/contract';
import { api } from '../lib/api';
import { ERROR_MESSAGES } from '../utils/constants';

export function RedeemForm({ balance, weeklyCapacity, onRedeemComplete }) {
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const maxRedeemable = Math.min(balance, weeklyCapacity);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please describe the work you need');
      return;
    }

    if (quantity > maxRedeemable) {
      setError('Cannot redeem more than available balance or weekly limit');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStatus('> Creating redemption request...');

      // First, create redemption request via API
      const { requestId } = await api.createRedemptionRequest(quantity, description.trim());
      
      setStatus('> Confirming redemption on-chain...');

      // Execute redemption using requestId as workCID
      const txHash = await redeemHours(quantity, requestId);

      setStatus('SUCCESS: Redemption confirmed!');
      console.log('Redemption transaction:', txHash);

      // Call the callback to refresh data
      if (onRedeemComplete) {
        await onRedeemComplete();
      }

      // Reset form
      setQuantity(1);
      setDescription('');
      
    } catch (err) {
      console.error('Redemption failed:', err);
      
      // Map error messages
      const errorMessage = ERROR_MESSAGES[err.message] || err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (!error) {
        setTimeout(() => setStatus(''), 3000);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-mono">
      <div>
        <label className="block text-sm text-gray-400 mb-3">
          &gt; Hours to redeem: {quantity} hour{quantity !== 1 ? 's' : ''}
        </label>
        <input
          type="range"
          min="1"
          max={maxRedeemable || 1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          disabled={maxRedeemable === 0}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>{maxRedeemable || 1}</span>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm text-gray-400 mb-2">
          &gt; Describe your need:
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="I need help with..."
          rows={5}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-400 resize-none"
        />
      </div>

      <div className="bg-gray-800 rounded p-4">
        <p className="text-sm text-gray-400 mb-2">// Examples:</p>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>&gt; Architecture consultation</li>
          <li>&gt; Custom feature development</li>
          <li>&gt; One on one tutoring</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={loading || maxRedeemable === 0}
        className={`w-full py-3 px-4 rounded font-medium transition-colors ${
          loading || maxRedeemable === 0
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
            : 'bg-gray-800 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black'
        }`}
      >
        {loading ? status : '[ SUBMIT REQUEST ]'}
      </button>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500 rounded text-red-400 text-sm">
          ERROR: {error}
        </div>
      )}

      {status && !loading && !error && (
        <div className="p-3 bg-green-900/20 border border-green-500 rounded text-green-400 text-sm">
          {status}
        </div>
      )}
    </form>
  );
}