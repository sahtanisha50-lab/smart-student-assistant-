'use strict';

import { useEffect, useRef } from 'react';
import { eventBus } from './eventBus';

// useEventBus(eventName, handler, deps?)
// - `eventName` string topic to subscribe to
// - `handler` callback called with event payload
// - `deps` optional dependency array to control re-subscription
export default function useEventBus(eventName, handler, deps = []) {
  const handlerRef = useRef(handler);

  // always keep latest handler reference
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrapped = (payload) => {
      try { handlerRef.current(payload); } catch (e) { console.error(e); }
    };
    const off = eventBus.on(eventName, wrapped);
    return off;
    // intentionally allow caller to pass deps controlling re-subscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...(deps || [])]);
}
