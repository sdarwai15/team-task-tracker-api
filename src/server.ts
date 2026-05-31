import './config/env';
import app from './app';
import { env } from './config/env';
import { connectRedis } from './config/redis';

const start = async () => {
  try {
    await connectRedis();
    app.listen(env.PORT, () => {
      console.log(`[server] Running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
};

start();
