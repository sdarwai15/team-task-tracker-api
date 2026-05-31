import { createClient } from 'redis';
import { env } from './env';

const client = createClient({
  url: env.REDIS_URL,
});

client.on('error', (err) => {
  console.error('[redis] Client error:', err);
});

client.on('connect', () => {
  console.log('[redis] Connected');
});

client.on('disconnect', () => {
  console.log('[redis] Disconnected');
});

export const connectRedis = async (): Promise<void> => {
  if (!client.isOpen) {
    await client.connect();
  }
};

export const redis = client;
