import { Response } from 'express';

interface SSEClient {
  userId: string;
  orgId: string;
  res: Response;
}

/**
 * Manages active SSE connections.
 * Tracks clients by userId so we can push targeted notifications.
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(clientId: string, userId: string, orgId: string, res: Response): void {
    this.clients.set(clientId, { userId, orgId, res });
    console.log(`[sse] Client connected: ${clientId} (user: ${userId})`);
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[sse] Client disconnected: ${clientId}`);
  }

  // Push event to a specific user
  pushToUser(userId: string, event: string, data: unknown): void {
    for (const [, client] of this.clients) {
      if (client.userId === userId) {
        this.sendEvent(client.res, event, data);
      }
    }
  }

  // Push event to all users in an org
  pushToOrg(orgId: string, event: string, data: unknown): void {
    for (const [, client] of this.clients) {
      if (client.orgId === orgId) {
        this.sendEvent(client.res, event, data);
      }
    }
  }

  private sendEvent(res: Response, event: string, data: unknown): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('[sse] Failed to send event:', err);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
