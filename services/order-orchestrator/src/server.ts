import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { orderRoutes } from './routes/orders';
import { startEventConsumer, stopEventConsumer } from './services/event-consumer';
import { closePool } from './plugins/database';
import { closeRedis } from './plugins/redis';

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    requestTimeout: 30000,
    bodyLimit: 1048576, // 1MB
  });

  // ---- Plugins ----
  await fastify.register(cors, {
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
  });

  // ---- Error handler ----
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      fastify.log.error(error);
    } else {
      fastify.log.warn(error.message);
    }

    reply.status(statusCode).send({
      success: false,
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    });
  });

  // ---- Routes ----
  await fastify.register(healthRoutes);
  await fastify.register(orderRoutes);

  // ---- Graceful shutdown ----
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);

    stopEventConsumer();

    await fastify.close();
    await closePool();
    await closeRedis();

    fastify.log.info('Server shut down');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ---- Start server ----
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(
      `Order Orchestrator running at http://${config.host}:${config.port}`
    );

    // Start Redis stream consumer (non-blocking)
    startEventConsumer().catch((err) => {
      fastify.log.error('Failed to start event consumer:', err);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
