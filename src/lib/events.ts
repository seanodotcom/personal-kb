import { EventEmitter } from 'events';

declare global {
  var sseEmitter: EventEmitter | undefined;
}

export const sseEmitter = global.sseEmitter || new EventEmitter();

// Max listeners safety limit
sseEmitter.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  global.sseEmitter = sseEmitter;
}
