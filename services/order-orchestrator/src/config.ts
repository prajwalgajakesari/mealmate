import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3003', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://localhost:5432/mealmate'),
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
  },

  redis: {
    url: requireEnv('REDIS_URL', 'redis://localhost:6379'),
    streamKey: process.env.REDIS_STREAM_KEY ?? 'mealmate:events',
    consumerGroup: process.env.REDIS_CONSUMER_GROUP ?? 'order-orchestrator',
    consumerName: process.env.REDIS_CONSUMER_NAME ?? `order-orch-${process.pid}`,
  },

  services: {
    pantryTrackerUrl: requireEnv('PANTRY_TRACKER_URL', 'http://localhost:3002'),
    swiggyMcpUrl: process.env.SWIGGY_MCP_URL ?? 'http://localhost:4001',
    blinkitMcpUrl: process.env.BLINKIT_MCP_URL ?? 'http://localhost:4002',
  },

  cart: {
    redisTtlSeconds: parseInt(process.env.CART_TTL_SECONDS ?? '86400', 10), // 24h
    defaultPlatform: (process.env.DEFAULT_PLATFORM ?? 'swiggy_instamart') as 'swiggy_instamart' | 'blinkit' | 'zepto',
    deliveryFee: parseFloat(process.env.DEFAULT_DELIVERY_FEE ?? '25'),
    freeDeliveryThreshold: parseFloat(process.env.FREE_DELIVERY_THRESHOLD ?? '499'),
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
} as const;

export type Config = typeof config;
