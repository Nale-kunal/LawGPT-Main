/**
 * usePresence.ts
 *
 * Exposes real-time user online/offline/away status.
 */

import { useCommunity } from '../contexts/CommunityContext';
import { useCallback } from 'react';

export function usePresence() {
  const { onlineUsers, socket, isConnected } = useCommunity();

  const getUserStatus = useCallback((userId: string): 'online' | 'away' | 'offline' => {
    return onlineUsers[userId] || 'offline';
  }, [onlineUsers]);

  const isUserOnline = useCallback((userId: string): boolean => {
    return getUserStatus(userId) === 'online';
  }, [getUserStatus]);

  const updateOwnPresence = useCallback((status: 'online' | 'away' | 'offline') => {
    if (socket && isConnected) {
      socket.emit('presenceUpdate', { status });
    }
  }, [socket, isConnected]);

  return {
    onlineUsers,
    getUserStatus,
    isUserOnline,
    updateOwnPresence,
  };
}

export default usePresence;
