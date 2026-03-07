import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {
      status: 'ok',
      service: 'whatsapp-bot',
      timestamp: new Date().toISOString(),
    };

    // Check PostgreSQL
    try {
      await fastify.pg.query('SELECT 1');
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    // Check Redis
    try {
      await fastify.redis.ping();
      checks.redis = 'connected';
    } catch {
      checks.redis = 'disconnected';
      checks.status = 'degraded';
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(checks);
  });
};

export default healthRoutes;
