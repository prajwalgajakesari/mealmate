import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';

// Plugins
import databasePlugin from './plugins/database';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      ...(config.nodeEnv === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : {}),
    },
    trustProxy: true,
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 && config.nodeEnv === 'production'
        ? 'Internal Server Error'
        : error.message;

    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message,
    });
  });

  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Plugins (order matters: database first, then redis, then auth which depends on database)
  await fastify.register(databasePlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);

  return fastify;
}

async function start() {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    app = await buildApp();

    await app.listen({ port: config.port, host: config.host });
    app.log.info(`User Service running on ${config.host}:${config.port}`);
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app!.log.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await app!.close();
        app!.log.info('Server closed');
        process.exit(0);
      } catch (err) {
        app!.log.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  }
}

start();

export { buildApp };
