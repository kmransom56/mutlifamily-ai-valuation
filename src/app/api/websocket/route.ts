import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WebSocketMessage, ProcessingStatusUpdate } from '@/types/processing';

// WebSocket connection management
const connections = new Map<string, WebSocket>();
const userConnections = new Map<string, Set<string>>();

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const upgrade = request.headers.get('upgrade');
    
    if (upgrade !== 'websocket') {
      return NextResponse.json({
        message: 'WebSocket endpoint',
        connections: Array.from(connections.keys()).length,
        userConnections: userConnections.get(session.user.id)?.size || 0
      });
    }

    // Handle WebSocket upgrade request
    // Note: In a production environment, you would use a proper WebSocket library
    // like 'ws' or implement this with Socket.IO
    return new Response('WebSocket upgrade not implemented in this demo', {
      status: 501,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error('WebSocket error:', error);
    return NextResponse.json(
      { error: 'WebSocket connection failed' },
      { status: 500 }
    );
  }
}

// Helper functions for WebSocket management
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections = new Map<string, any>();
  private userConnections = new Map<string, Set<string>>();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addConnection(connectionId: string, userId: string, ws: any) {
    this.connections.set(connectionId, {
      ws,
      userId,
      connectedAt: new Date().toISOString()
    });

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    console.log(`WebSocket connection added: ${connectionId} for user ${userId}`);
  }

  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const { userId } = connection;
      this.connections.delete(connectionId);
      
      const userConns = this.userConnections.get(userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(userId);
        }
      }

      console.log(`WebSocket connection removed: ${connectionId}`);
    }
  }

  sendToUser(userId: string, message: WebSocketMessage) {
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          try {
            connection.ws.send(JSON.stringify(message));
          } catch (error) {
            console.error(`Failed to send message to connection ${connectionId}:`, error);
            this.removeConnection(connectionId);
          }
        }
      });
    }
  }

  sendToConnection(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }
  }

  broadcastProcessingUpdate(jobId: string, userId: string, update: ProcessingStatusUpdate) {
    const message: WebSocketMessage = {
      type: 'status_update',
      jobId,
      data: update,
      timestamp: new Date().toISOString()
    };

    this.sendToUser(userId, message);
  }

  broadcastProgressUpdate(jobId: string, userId: string, progress: number, message: string) {
    const update: ProcessingStatusUpdate = {
      jobId,
      status: 'processing',
      progress,
      currentStep: message,
      message,
      timestamp: new Date().toISOString()
    };

    this.broadcastProcessingUpdate(jobId, userId, update);
  }

  broadcastJobComplete(jobId: string, userId: string, results: any) {
    const message: WebSocketMessage = {
      type: 'job_completed',
      jobId,
      data: results,
      timestamp: new Date().toISOString()
    };

    this.sendToUser(userId, message);
  }

  broadcastError(jobId: string, userId: string, error: string) {
    const message: WebSocketMessage = {
      type: 'error',
      jobId,
      data: { error },
      timestamp: new Date().toISOString()
    };

    this.sendToUser(userId, message);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }
}

// Export the singleton instance
export const wsManager = WebSocketManager.getInstance();

// Helper function to send processing updates
export function sendProcessingUpdate(jobId: string, userId: string, update: ProcessingStatusUpdate) {
  wsManager.broadcastProcessingUpdate(jobId, userId, update);
}

export function sendProgressUpdate(jobId: string, userId: string, progress: number, message: string) {
  wsManager.broadcastProgressUpdate(jobId, userId, progress, message);
}

export function sendJobComplete(jobId: string, userId: string, results: any) {
  wsManager.broadcastJobComplete(jobId, userId, results);
}

export function sendError(jobId: string, userId: string, error: string) {
  wsManager.broadcastError(jobId, userId, error);
}