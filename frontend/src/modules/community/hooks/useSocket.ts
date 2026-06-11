/**
 * useSocket.ts
 *
 * Hook to access the WebSocket instance and its connection status.
 */

import { useCommunity } from '../contexts/CommunityContext';

export function useSocket() {
  const { socket, isConnected } = useCommunity();
  return {
    socket,
    isConnected,
  };
}

export default useSocket;
