import { addLog, getLogs, subscribe } from '@/lib/server/logStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (entry: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
      };

      getLogs().forEach(send);
      send({ type: 'ready' });

      const unsubscribe = subscribe((entry) => send(entry));

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
      }, 15000);

      controller.enqueue(encoder.encode('event: open\ndata: {}\n\n'));

      return () => {
        clearInterval(ping);
        unsubscribe();
      };
    },
  });

  addLog('info', 'Log stream connected');

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
