import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: false,
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }
  return redisClient;
}

export function getSubscriberRedis(): Redis {
  if (!subscriberClient) {
    subscriberClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    subscriberClient.on('error', (err) => {
      console.error('[Redis:Subscriber] Connection error:', err.message);
    });
  }
  return subscriberClient;
}

// ---- Stream Helpers ----

export async function publishEvent(
  event: Record<string, unknown>
): Promise<string> {
  const redis = getRedis();
  const fields: string[] = [];
  // Flatten event into key-value pairs for XADD
  fields.push('data', JSON.stringify(event));
  fields.push('event', String(event.event));
  fields.push('userId', String(event.userId));
  fields.push('timestamp', String(event.timestamp ?? new Date().toISOString()));

  const id = await redis.xadd(config.redis.streamKey, '*', ...fields);
  console.log(`[Redis] Published event ${event.event} with stream ID ${id}`);
  return id;
}

export async function ensureConsumerGroup(): Promise<void> {
  const redis = getRedis();
  try {
    await redis.xgroup(
      'CREATE',
      config.redis.streamKey,
      config.redis.consumerGroup,
      '0',
      'MKSTREAM'
    );
    console.log(`[Redis] Consumer group '${config.redis.consumerGroup}' created`);
  } catch (err: unknown) {
    const error = err as Error;
    // Group already exists — that's fine
    if (error.message?.includes('BUSYGROUP')) {
      console.log(`[Redis] Consumer group '${config.redis.consumerGroup}' already exists`);
    } else {
      throw err;
    }
  }
}

export interface StreamMessage {
  id: string;
  fields: Record<string, string>;
}

export async function readFromStream(
  count = 5,
  blockMs = 5000
): Promise<StreamMessage[]> {
  const redis = getSubscriberRedis();
  const result = await redis.xreadgroup(
    'GROUP',
    config.redis.consumerGroup,
    config.redis.consumerName,
    'COUNT',
    count,
    'BLOCK',
    blockMs,
    'STREAMS',
    config.redis.streamKey,
    '>'
  );

  if (!result) return [];

  const messages: StreamMessage[] = [];
  for (const [, entries] of result) {
    for (const [id, fields] of entries) {
      const fieldMap: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        fieldMap[fields[i]] = fields[i + 1];
      }
      messages.push({ id, fields: fieldMap });
    }
  }
  return messages;
}

export async function ackMessage(messageId: string): Promise<void> {
  const redis = getRedis();
  await redis.xack(config.redis.streamKey, config.redis.consumerGroup, messageId);
}

// ---- Cart Cache Helpers ----

export async function setCartCache(
  userId: string,
  cart: unknown
): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `cart:${userId}`,
    JSON.stringify(cart),
    'EX',
    config.cart.redisTtlSeconds
  );
}

export async function getCartCache(userId: string): Promise<unknown | null> {
  const redis = getRedis();
  const data = await redis.get(`cart:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteCartCache(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`cart:${userId}`);
}

export async function redisHealthCheck(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
}
