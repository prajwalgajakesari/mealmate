import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import databasePlugin from './plugins/database';
import redisPlugin from './plugins/redis';
import healthRoutes from './routes/health';
import webhookRoutes from './routes/webhook';
import { startEventConsumer } from './services/event-consumer';

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      ...(config.nodeEnv === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
  });

  // Parse URL-encoded bodies (Twilio sends form-encoded webhooks)
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (req, body, done) => {
      try {
        const parsed = Object.fromEntries(
          new URLSearchParams(body as string).entries()
        );
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Register plugins
  await fastify.register(databasePlugin);
  await fastify.register(redisPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(webhookRoutes);

  // Start Redis stream consumer after server is ready
  let stopConsumer: (() => void) | undefined;

  fastify.addHook('onReady', async () => {
    try {
      stopConsumer = await startEventConsumer(
        fastify.redis,
        fastify.pg,
        fastify.log
      );
    } catch (err) {
      fastify.log.error({ err }, 'Failed to start event consumer');
      // Don't crash the server — webhook still works without the consumer
    }
  });

  fastify.addHook('onClose', async () => {
    if (stopConsumer) {
      stopConsumer();
    }
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info({ signal }, 'Received signal, shutting down gracefully');
      await fastify.close();
      process.exit(0);
    });
  }

  // Start listening
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(
      { port: config.port, host: config.host },
      'WhatsApp Bot service started'
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
