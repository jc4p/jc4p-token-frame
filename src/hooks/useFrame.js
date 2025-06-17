import { useState, useEffect } from 'react';
import { frame } from '../lib/frame';

export function useFrame() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFrameContext() {
      try {
        const context = await frame.sdk.context;
        if (context && context.user) {
          let frameUser = context.user;
          // Handle known issue where user might be nested
          if (frameUser.user) {
            frameUser = frameUser.user;
          }
          setUser(frameUser);
        } else {
          setError('Not in frame context');
        }
      } catch (err) {
        console.error('Failed to load frame context:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFrameContext();
  }, []);

  return { user, loading, error };
}