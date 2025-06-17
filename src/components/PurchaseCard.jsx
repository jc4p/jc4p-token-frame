import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  getUserAddress, 
  getUSDCNonce, 
  signUSDCPermit, 
  purchaseHours 
} from '../lib/contract';
import { BASE_PRICE, ERROR_MESSAGES } from '../utils/constants';

export function PurchaseCard({ onPurchaseComplete, remainingSupply = 50, discount, checkingDiscount }) {
  const [quantity, setQuantity] = useState(1);
  const [customQuantity, setCustomQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const maxPurchasable = Math.min(10, remainingSupply);

  const handleQuickSelect = (qty) => {
    setQuantity(qty);
    setCustomQuantity('');
  };

  const handleCustomChange = (e) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) > 0 && parseInt(value) <= maxPurchasable)) {
      setCustomQuantity(value);
      if (value !== '') {
        setQuantity(parseInt(value));
      }
    }
  };

  const calculateDisplayPrice = (showDiscount = true) => {
    const totalBase = quantity * BASE_PRICE;
    if (showDiscount && discount && discount.percentage) {
      const discountAmount = (totalBase * discount.percentage) / 100;
      return totalBase - discountAmount;
    }
    return totalBase;
  };

  const formatUSDC = (amount) => {
    return (amount / 10**6).toFixed(2);
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError('');
      setStatus('> Getting voucher...');

      // Get user address
      const userAddress = await getUserAddress();

      // Get voucher from API
      const voucherData = await api.getVoucher(quantity, userAddress);
      const { voucher, signature } = voucherData;
      
      console.log('Voucher data:', voucherData);
      console.log('Voucher price:', voucher.price, 'which is', (voucher.price / 10**6), 'USDC');

      setStatus('> Preparing USDC approval...');

      // Get USDC nonce
      const usdcNonce = await getUSDCNonce(userAddress);

      // Create permit
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const permitSig = await signUSDCPermit(userAddress, voucher.price, usdcNonce, deadline);

      setStatus('> Confirming purchase...');

      // Execute purchase
      const txHash = await purchaseHours(voucher, signature, permitSig);

      setStatus('SUCCESS: Purchase confirmed!');
      console.log('Purchase transaction:', txHash);

      // Call the callback to refresh data
      if (onPurchaseComplete) {
        await onPurchaseComplete();
      }

      // Reset form
      setQuantity(1);
      setCustomQuantity('');
      
    } catch (err) {
      console.error('Purchase failed:', err);
      
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
    <div className="bg-gray-900 border border-gray-800 rounded p-6 font-mono">
      <h2 className="text-lg font-semibold mb-4 text-green-400 font-sans">
        <span className="font-mono text-amber-500">[</span> Buy Dev Hours <span className="font-mono text-amber-500">]</span>
      </h2>
      
      {/* Discount Celebration Message */}
      {!checkingDiscount && discount && discount.percentage > 0 && (
        <div className="bg-green-900/20 border border-green-500 rounded p-3 mb-4 text-green-400 text-sm text-center">
          <div className="font-bold mb-1">🎉 CONGRATULATIONS! 🎉</div>
          <div>You qualify for the {discount.reason} discount!</div>
          <div className="text-xs mt-1 text-gray-400">Save {discount.percentage}% on all purchases</div>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickSelect(1)}
            className={`flex-1 py-3 px-4 rounded border-2 transition-colors ${
              quantity === 1 && !customQuantity 
                ? 'border-green-400 bg-gray-800 text-green-400' 
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            [ 1 ]
          </button>
          <button
            onClick={() => handleQuickSelect(2)}
            className={`flex-1 py-3 px-4 rounded border-2 transition-colors ${
              quantity === 2 && !customQuantity 
                ? 'border-green-400 bg-gray-800 text-green-400' 
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            [ 2 ]
          </button>
          <button
            onClick={() => handleQuickSelect(5)}
            disabled={maxPurchasable < 5}
            className={`flex-1 py-3 px-4 rounded border-2 transition-colors ${
              quantity === 5 && !customQuantity 
                ? 'border-green-400 bg-gray-800 text-green-400' 
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            } ${maxPurchasable < 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            [ 5 ]
          </button>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-3">&gt; Custom amount: {quantity} hour{quantity !== 1 ? 's' : ''}</label>
          <input
            type="range"
            min="1"
            max={maxPurchasable}
            value={quantity}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setQuantity(value);
              setCustomQuantity(value.toString());
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>{maxPurchasable}</span>
          </div>
        </div>

        <div className="space-y-2 py-3 border-t border-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">RATE:</span>
            <span className="text-gray-200">
              {discount && discount.percentage > 0 ? (
                <>
                  <span className="line-through text-gray-500">300</span>{' '}
                  <span className="text-green-400">{300 - (300 * discount.percentage / 100)}</span> USDC/hour
                </>
              ) : (
                '300 USDC/hour'
              )}
            </span>
          </div>
          
          {discount && discount.percentage > 0 && (
            <div className="flex justify-between text-sm text-green-400 font-bold">
              <span>🎉 {discount.reason.toUpperCase()} DISCOUNT:</span>
              <span>-{discount.percentage}%</span>
            </div>
          )}
          
          <div className="flex justify-between font-semibold pt-2">
            <span className="text-amber-500">TOTAL:</span>
            <span className="text-amber-500">
              {discount && discount.percentage > 0 && (
                <>
                  <span className="line-through text-gray-500 text-sm mr-2">
                    {formatUSDC(calculateDisplayPrice(false))}
                  </span>
                </>
              )}
              <span className="text-lg">{formatUSDC(calculateDisplayPrice())} USDC</span>
            </span>
          </div>
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading || quantity === 0}
          className={`w-full py-3 px-4 rounded font-medium transition-colors ${
            loading || quantity === 0
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-800 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black'
          }`}
        >
          {loading ? status : `[ PURCHASE ${quantity} HOUR${quantity !== 1 ? 'S' : ''} ]`}
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
      </div>
    </div>
  );
}