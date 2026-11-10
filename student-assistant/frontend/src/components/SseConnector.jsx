import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { startSSE, stopSSE } from '../lib/sseClient';

export default function SseConnector() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const es = startSSE();
    return () => stopSSE(es);
  }, [user]);

  return null;
}
