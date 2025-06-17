import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentActivity = async () => {
      try {
        const data = await api.getGlobalHistory(5, 0);
        // Filter to only show purchases for social proof
        const recentPurchases = data.activities
          .filter(activity => activity.type === 'purchase')
          .slice(0, 3); // Show only 3 most recent
        setActivities(recentPurchases);
      } catch (error) {
        console.error('Failed to load recent activity:', error);
        // Fail silently, just don't show the component
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecentActivity();
  }, []);

  // Helper to format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  // Helper to format address/username
  const formatUser = (activity) => {
    if (activity.username) {
      return activity.username;
    }
    // Truncate address to 0x42...a8f9 format
    const addr = activity.buyer || activity.user;
    if (addr) {
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    return 'Anonymous';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded p-4 font-mono text-sm">
        <div className="text-gray-500">$ recent.activity</div>
        <div className="mt-2 text-gray-400">
          <span className="animate-pulse">LOADING...</span>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show the component if no activity
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 font-mono text-sm">
      <div className="text-gray-500 mb-3">$ recent.activity</div>
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div key={activity.id || index} className="text-gray-300 flex items-center justify-between">
            <span>
              <span className="text-green-400">{formatUser(activity)}</span> bought{' '}
              <span className="text-amber-500">{activity.qty}</span> hour{activity.qty !== 1 ? 's' : ''}
              {activity.discount?.percentage > 0 && (
                <span className="text-gray-500 text-xs ml-1">
                  ({activity.discount.percentage}% off)
                </span>
              )}
            </span>
            <span className="text-gray-500 text-xs">{formatTimeAgo(activity.timestamp)}</span>
          </div>
        ))}
      </div>
      {activities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            &gt; {activities.reduce((sum, a) => sum + a.qty, 0)} hours purchased recently
          </p>
        </div>
      )}
    </div>
  );
}