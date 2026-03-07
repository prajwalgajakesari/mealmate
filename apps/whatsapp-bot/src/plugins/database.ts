import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Pool, PoolClient } from 'pg';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

const databasePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    fastify.log.info('PostgreSQL connected successfully');
  } catch (err) {
    fastify.log.error('Failed to connect to PostgreSQL:', err);
    throw err;
  } finally {
    client?.release();
  }

  fastify.decorate('pg', pool);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL pool');
    await pool.end();
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
