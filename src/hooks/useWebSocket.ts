import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WebSocketMessage, ProcessingStatusUpdate } from '@/types/processing';

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onStatusUpdate?: (update: ProcessingStatusUpdate) => void;
  onJobComplete?: (data: any) => void;
  onError?: (error: string) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectCount: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const {
    onMessage,
    onStatusUpdate,
    onJobComplete,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    reconnectCount: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!session?.user || state.connecting || state.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      // Note: In a production environment, you would use a proper WebSocket URL
      // For now, we'll simulate WebSocket functionality with polling
      const ws = new WebSocket(`ws://localhost:3000/api/websocket?userId=${session.user.id}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null
        }));
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          
          onMessage?.(message);

          switch (message.type) {
            case 'status_update':
            case 'progress_update':
              onStatusUpdate?.(message.data as ProcessingStatusUpdate);
              break;
            case 'job_completed':
              onJobComplete?.(message.data);
              break;
            case 'error':
              onError?.(message.data.error);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'Connection error'
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false
        }));
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          setState(prev => ({ ...prev, reconnectCount: reconnectAttemptsRef.current }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setState(prev => ({
            ...prev,
            error: 'Max reconnection attempts reached'
          }));
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        connecting: false,
        error: 'Failed to create connection'
      }));
    }
  }, [session, state.connecting, state.connected, onMessage, onStatusUpdate, onJobComplete, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      connected: false,
      connecting: false,
      error: null,
      lastMessage: null,
      reconnectCount: 0
    });
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && state.connected) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    }
  }, [state.connected]);

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.user && !state.connected && !state.connecting) {
      connect();
    }
  }, [session, state.connected, state.connecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage
  };
}

// Hook specifically for job status updates
export function useJobStatusWebSocket(jobId: string | null) {
  const [jobStatus, setJobStatus] = useState<ProcessingStatusUpdate | null>(null);
  const [jobResults, setJobResults] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const { connected, connect, disconnect } = useWebSocket({
    onStatusUpdate: (update) => {
      if (jobId && update.jobId === jobId) {
        setJobStatus(update);
      }
    },
    onJobComplete: (data) => {
      if (jobId && data.jobId === jobId) {
        setJobResults(data);
      }
    },
    onError: (error) => {
      setJobError(error);
    }
  });

  // Reset state when jobId changes
  useEffect(() => {
    setJobStatus(null);
    setJobResults(null);
    setJobError(null);
  }, [jobId]);

  return {
    connected,
    jobStatus,
    jobResults,
    jobError,
    connect,
    disconnect
  };
}

// Simulated WebSocket for development/demo purposes
export class SimulatedWebSocket {
  private static connections = new Map<string, any>();
  private static intervals = new Map<string, NodeJS.Timeout>();

  static connect(userId: string, onMessage: (message: WebSocketMessage) => void) {
    const connectionId = `${userId}-${Date.now()}`;
    
    const connection = {
      id: connectionId,
      userId,
      onMessage,
      connected: true
    };

    this.connections.set(connectionId, connection);

    // Simulate connection success
    setTimeout(() => {
      onMessage({
        type: 'status_update',
        jobId: 'demo',
        data: {
          jobId: 'demo',
          status: 'processing',
          progress: 0,
          currentStep: 'Connected to real-time updates',
          message: 'WebSocket connection established',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }, 100);

    return connectionId;
  }

  static disconnect(connectionId: string) {
    this.connections.delete(connectionId);
    
    const interval = this.intervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(connectionId);
    }
  }

  static sendToUser(userId: string, message: WebSocketMessage) {
    this.connections.forEach(connection => {
      if (connection.userId === userId && connection.connected) {
        connection.onMessage(message);
      }
    });
  }

  static simulateJobProgress(jobId: string, userId: string) {
    let progress = 0;
    const steps = [
      'Initializing job processing',
      'Extracting data from documents',
      'Analyzing financial metrics',
      'Generating market insights',
      'Creating investment analysis',
      'Finalizing results'
    ];

    const interval = setInterval(() => {
      progress += Math.random() * 20;
      const currentStep = steps[Math.floor((progress / 100) * steps.length)] || steps[steps.length - 1];

      this.sendToUser(userId, {
        type: 'progress_update',
        jobId,
        data: {
          jobId,
          status: progress >= 100 ? 'completed' : 'processing',
          progress: Math.min(progress, 100),
          currentStep,
          message: `${currentStep} (${Math.round(progress)}%)`
        },
        timestamp: new Date().toISOString()
      });

      if (progress >= 100) {
        clearInterval(interval);
        
        // Send completion message
        setTimeout(() => {
          this.sendToUser(userId, {
            type: 'job_completed',
            jobId,
            data: {
              jobId,
              results: 'Job completed successfully',
              downloadUrls: {
                analysis: `/api/files?jobId=${jobId}&file=analysis.pdf`,
                pitchDeck: `/api/files?jobId=${jobId}&file=pitch-deck.pptx`
              }
            },
            timestamp: new Date().toISOString()
          });
        }, 1000);
      }
    }, 2000);

    return interval;
  }
}