import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 3) {
        fastify.log.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  try {
    await redis.connect();
    fastify.log.info('Redis connected successfully');
  } catch (err) {
    fastify.log.error('Failed to connect to Redis:', err);
    throw err;
  }

  redis.on('error', (err) => {
    fastify.log.error('Redis error:', err);
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing Redis connection');
    await redis.quit();
  });
};

export default fp(redisPlugin, {
  name: 'redis',
});
