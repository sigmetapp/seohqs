import { NextResponse } from 'next/server';
import { subscribeToPostbackEvents } from '@/lib/postback-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const siteId = parseInt(params.id, 10);

  if (Number.isNaN(siteId)) {
    return NextResponse.json(
      { success: false, error: 'Некорректный идентификатор сайта' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let abortHandler: (() => void) | null = null;

  const cleanup = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (abortHandler) {
      request.signal.removeEventListener('abort', abortHandler);
      abortHandler = null;
    }

    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {
        // already closed
      }
      controllerRef = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;

      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // Inform the client that streaming is ready
      send({ type: 'ready' });

      unsubscribe = subscribeToPostbackEvents(siteId, (postback) => {
        send(postback);
      });

      keepAliveTimer = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      abortHandler = () => cleanup();
      request.signal.addEventListener('abort', abortHandler);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
