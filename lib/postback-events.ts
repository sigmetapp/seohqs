import { EventEmitter } from 'events';
import { PostbackData } from './types';

type PostbackEventPayload = PostbackData;

declare global {
  // eslint-disable-next-line no-var
  var __postbackEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter = globalThis.__postbackEmitter ?? new EventEmitter();

if (!globalThis.__postbackEmitter) {
  emitter.setMaxListeners(100);
  globalThis.__postbackEmitter = emitter;
}

const getChannelName = (siteId: number) => `postback:${siteId}`;

export function emitPostbackEvent(postback: PostbackEventPayload) {
  emitter.emit(getChannelName(postback.siteId), postback);
}

export function subscribeToPostbackEvents(
  siteId: number,
  handler: (postback: PostbackEventPayload) => void
): () => void {
  const channel = getChannelName(siteId);
  emitter.on(channel, handler);
  return () => {
    emitter.off(channel, handler);
  };
}

export type { PostbackEventPayload };
