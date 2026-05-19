import { NextRequest } from 'next/server';
import { getThoughts } from '@/lib/actions';
import { sseEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send the thoughts list formatted as SSE
      const sendThoughts = async () => {
        try {
          const thoughts = await getThoughts();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(thoughts)}\n\n`));
        } catch (err) {
          console.error('Error fetching thoughts in SSE:', err);
        }
      };

      // Send initial data immediately
      await sendThoughts();

      // Listen for local events (local dev or same container instance)
      const onNewThought = async () => {
        await sendThoughts();
      };
      sseEmitter.on('new-thought', onNewThought);

      // Keep track of the timestamp of the latest thought sent to trigger updates
      let latestThoughtTime: number = 0;
      try {
        const initial = await getThoughts(1);
        if (initial.length > 0) {
          latestThoughtTime = new Date(initial[0].createdAt).getTime();
        }
      } catch (e) {
        console.error('Failed to get initial latest thought time:', e);
      }

      // Check database for cross-instance updates every 3 seconds
      const intervalId = setInterval(async () => {
        try {
          const latestList = await getThoughts(1);
          if (latestList.length > 0) {
            const time = new Date(latestList[0].createdAt).getTime();
            if (time > latestThoughtTime) {
              latestThoughtTime = time;
              await sendThoughts();
            }
          }
        } catch (err) {
          console.error('SSE polling check error:', err);
        }
      }, 3000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        sseEmitter.off('new-thought', onNewThought);
        clearInterval(intervalId);
        try {
          controller.close();
        } catch (e) {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
