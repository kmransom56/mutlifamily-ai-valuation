// Define payload types for each event type
interface StatusUpdatePayload {
  type: 'status_update';
  jobId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface ProgressUpdateData {
  jobId: string;
  status: 'processing';
  progress: number;
  currentStep: string;
  message: string;
  timestamp: string;
}

interface ProgressUpdatePayload {
  type: 'progress_update';
  jobId: string;
  data: ProgressUpdateData;
  timestamp: string;
}

interface JobCompletedPayload {
  type: 'job_completed';
  jobId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface ErrorPayload {
  type: 'error';
  jobId: string;
  data: { error: string };
  timestamp: string;
}

type SseEventPayload =
  | StatusUpdatePayload
  | ProgressUpdatePayload
  | JobCompletedPayload
  | ErrorPayload;

interface SseClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: string;
}

const userIdToClients = new Map<string, Set<string>>();
const clientIdToClient = new Map<string, SseClient>();

function encode(data: string): Uint8Array {
  return new TextEncoder().encode(data);
}

function writeEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: string, payload: SseEventPayload) {
  const lines = [`event: ${event}`, `data: ${JSON.stringify(payload)}`, '', ''];
  controller.enqueue(encode(lines.join('\n')));
}

export function sseAddClient(userId: string, controller: ReadableStreamDefaultController<Uint8Array>): string {
  const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client: SseClient = { id, userId, controller, connectedAt: new Date().toISOString() };
  clientIdToClient.set(id, client);
  if (!userIdToClients.has(userId)) userIdToClients.set(userId, new Set());
  userIdToClients.get(userId)!.add(id);

  // initial comment to open stream
  controller.enqueue(encode(': connected\n\n'));
  return id;
}

export function sseRemoveClient(clientId: string) {
  const client = clientIdToClient.get(clientId);
  if (!client) return;
  const { userId } = client;
  clientIdToClient.delete(clientId);
  const set = userIdToClients.get(userId);
  if (set) {
    set.delete(clientId);
    if (set.size === 0) userIdToClients.delete(userId);
  }
}

function sseSendToUser(userId: string, event: string, payload: SseEventPayload) {
  const clientIds = userIdToClients.get(userId);
  if (!clientIds) return;
  clientIds.forEach((cid) => {
    const client = clientIdToClient.get(cid);
    if (!client) return;
    try {
      writeEvent(client.controller, event, payload);
    } catch (err) {
      // remove bad client
      sseRemoveClient(cid);
    }
  });
}

export function sseSendProcessingUpdate(jobId: string, userId: string, update: any) {
  const payload: SseEventPayload = {
    type: 'status_update',
    jobId,
    data: update,
    timestamp: new Date().toISOString()
  };
  sseSendToUser(userId, 'status_update', payload);
}

export function sseSendProgressUpdate(jobId: string, userId: string, progress: number, message: string) {
  const payload: SseEventPayload = {
    type: 'progress_update',
    jobId,
    data: {
      jobId,
      status: 'processing',
      progress,
      currentStep: message,
      message,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  sseSendToUser(userId, 'progress_update', payload);
}

export function sseSendJobComplete(jobId: string, userId: string, results: any) {
  const payload: SseEventPayload = {
    type: 'job_completed',
    jobId,
    data: results,
    timestamp: new Date().toISOString()
  };
  sseSendToUser(userId, 'job_completed', payload);
}

export function sseSendError(jobId: string, userId: string, error: string) {
  const payload: SseEventPayload = {
    type: 'error',
    jobId,
    data: { error },
    timestamp: new Date().toISOString()
  };
  sseSendToUser(userId, 'error', payload);
}