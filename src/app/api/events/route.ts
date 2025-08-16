import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sseAddClient, sseRemoveClient } from '@/lib/sse-manager';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as any).id || session.user.email || 'anonymous';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const clientId = sseAddClient(userId, controller);
      // Keep connection alive with ping
      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {}
      }, 25000);

      // Close handler
      (controller as any)._clientId = clientId;
      (controller as any)._ping = ping;
    },
    cancel() {
      // Remove client and clear ping
      // @ts-ignore
      const clientId = this?._controller?._clientId || undefined;
      // @ts-ignore
      const ping = this?._controller?._ping || undefined;
      if (clientId) sseRemoveClient(clientId);
      if (ping) clearInterval(ping);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}