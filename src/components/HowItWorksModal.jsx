import { useState } from 'react';

export function HowItWorksModal() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-green-400 font-mono text-sm transition-colors"
      >
        [ How does it work? ]
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-green-400 font-sans">
            <span className="font-mono text-amber-500">[</span> How does it work? <span className="font-mono text-amber-500">]</span>
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-gray-300 text-sm">
          <div>
            <p className="text-amber-500 mb-2">&gt; BUYING HOURS</p>
            <p>Purchase dev hours using USDC on Base. Some users get special pricing based on their Farcaster activity (mutual follows, likes, etc).</p>
          </div>

          <div>
            <p className="text-amber-500 mb-2">&gt; REDEMPTION LIMITS</p>
            <p>Everyone combined can only redeem 16 hours per week - I only have so much time! This ensures quality over quantity.</p>
          </div>

          <div>
            <p className="text-amber-500 mb-2">&gt; WHAT HAPPENS NEXT</p>
            <p>After you redeem hours, I'll DM you on Farcaster and we'll kick off the project together.</p>
          </div>

          <div>
            <p className="text-amber-500 mb-2">&gt; SCOPE & ETHICS</p>
            <p>If your request is illegal or unethical, I'll refund you. If it doesn't fit in the hours you've bought, we'll create a phased approach and figure out what we can accomplish in the time allowed.</p>
          </div>

          <div>
            <p className="text-amber-500 mb-2">&gt; WHAT CAN YOU USE IT FOR?</p>
            <p>The time can be used for:</p>
            <ul className="mt-1 ml-4 space-y-1">
              <li>- Development hours</li>
              <li>- Technical consulting</li>
              <li>- MVP development</li>
              <li>- Architecture reviews</li>
              <li>- Code reviews</li>
              <li>- Training & mentoring</li>
              <li>- Custom features</li>
              <li>- ...and more!</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 px-4 bg-gray-800 border border-green-400 text-green-400 rounded hover:bg-green-400 hover:text-black transition-colors"
          >
            [ CLOSE ]
          </button>
        </div>
      </div>
    </div>
  );
}