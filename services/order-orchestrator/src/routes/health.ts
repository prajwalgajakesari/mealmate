import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { healthCheck as dbHealthCheck } from '../plugins/database';
import { redisHealthCheck } from '../plugins/redis';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/health',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [dbOk, redisOk] = await Promise.all([
        dbHealthCheck(),
        redisHealthCheck(),
      ]);

      const status = dbOk && redisOk ? 'healthy' : 'degraded';
      const statusCode = dbOk && redisOk ? 200 : 503;

      return reply.status(statusCode).send({
        status,
        service: 'order-orchestrator',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbOk ? 'ok' : 'fail',
          redis: redisOk ? 'ok' : 'fail',
        },
      });
    }
  );
}
