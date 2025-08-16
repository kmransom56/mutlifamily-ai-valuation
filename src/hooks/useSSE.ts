import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProcessingStatusUpdate, WebSocketMessage } from '@/types/processing';

export interface UseSSEOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onStatusUpdate?: (update: ProcessingStatusUpdate) => void;
  onJobComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { data: session } = useSession();
  const { onMessage, onStatusUpdate, onJobComplete, onError } = options;
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const es = new EventSource('/api/events');
    eventSourceRef.current = es;

    const handleStatus = (e: MessageEvent) => {
      try {
        const msg: WebSocketMessage = JSON.parse(e.data);
        onMessage?.(msg);
        onStatusUpdate?.(msg.data as ProcessingStatusUpdate);
      } catch (err) {
        console.error('Failed to parse SSE status message', err);
      }
    };

    const handleProgress = (e: MessageEvent) => {
      try {
        const msg: WebSocketMessage = JSON.parse(e.data);
        onMessage?.(msg);
        onStatusUpdate?.(msg.data as ProcessingStatusUpdate);
      } catch (err) {
        console.error('Failed to parse SSE progress message', err);
      }
    };

    const handleComplete = (e: MessageEvent) => {
      try {
        const msg: WebSocketMessage = JSON.parse(e.data);
        onMessage?.(msg);
        onJobComplete?.(msg.data);
      } catch (err) {
        console.error('Failed to parse SSE completion message', err);
      }
    };

    const handleError = (e: MessageEvent) => {
      try {
        const msg: WebSocketMessage = JSON.parse((e as any).data || '{}');
        onError?.(msg?.data?.error || 'SSE error');
      } catch {
        onError?.('SSE error');
      }
    };

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('status_update', handleStatus);
    es.addEventListener('progress_update', handleProgress);
    es.addEventListener('job_completed', handleComplete);
    es.addEventListener('error', handleError as any);

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      setConnected(false);
      try { es.close(); } catch {}
      eventSourceRef.current = null;
    };
  }, [session, onMessage, onStatusUpdate, onJobComplete, onError]);

  return { connected };
}

export function useJobStatusEvents(jobId: string | null) {
  const [jobStatus, setJobStatus] = useState<ProcessingStatusUpdate | null>(null);
  const [jobResults, setJobResults] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const { connected } = useSSE({
    onStatusUpdate: (update) => {
      if (jobId && update.jobId === jobId) setJobStatus(update);
    },
    onJobComplete: (data) => {
      if (jobId && data.jobId === jobId) setJobResults(data);
    },
    onError: (error) => setJobError(error)
  });

  useEffect(() => {
    setJobStatus(null);
    setJobResults(null);
    setJobError(null);
  }, [jobId]);

  return { connected, jobStatus, jobResults, jobError };
}