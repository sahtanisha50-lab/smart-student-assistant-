'use strict';

const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

export function off(event, handler) {
  if (!listeners.has(event)) return;
  listeners.get(event).delete(handler);
  if (listeners.get(event).size === 0) listeners.delete(event);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const h of Array.from(set)) {
    try {
      h(payload);
    } catch (err) {
      // avoid crashing UI when handlers throw
      // eslint-disable-next-line no-console
      console.error('eventBus handler error', err);
    }
  }
}

export const eventBus = { on, off, emit };
