import Redis from 'ioredis';
import { Pool } from 'pg';
import {
  sendMorningPlan,
  sendCartReady,
  sendCookInstructions,
  sendEveningFeedback,
  sendOrderConfirmation,
} from '../handlers/outgoing';
import {
  MealPlanTemplateData,
  CartSummaryTemplateData,
  CookInstructionsTemplateData,
  OrderConfirmationTemplateData,
} from '../templates/messages';

const STREAM_KEY = 'mealmate:events';
const CONSUMER_GROUP = 'whatsapp-bot-group';
const CONSUMER_NAME = `whatsapp-bot-${process.pid}`;
const BLOCK_MS = 5000;
const BATCH_SIZE = 10;

interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

interface EventPayload {
  event: string;
  userId: string;
  timestamp: string;
  channel?: string;
  template?: string;
  data?: string;
  [key: string]: unknown;
}

function parseStreamEntry(entry: [string, string[]]): StreamEntry {
  const [id, fieldArray] = entry;
  const fields: Record<string, string> = {};

  for (let i = 0; i < fieldArray.length; i += 2) {
    fields[fieldArray[i]] = fieldArray[i + 1];
  }

  return { id, fields };
}

function parsePayload(fields: Record<string, string>): EventPayload {
  // If there's a 'payload' field, parse it as JSON
  if (fields.payload) {
    try {
      return JSON.parse(fields.payload) as EventPayload;
    } catch {
      // Fall through to field-based parsing
    }
  }

  return {
    event: fields.event || '',
    userId: fields.userId || fields.user_id || '',
    timestamp: fields.timestamp || new Date().toISOString(),
    channel: fields.channel,
    template: fields.template,
    data: fields.data,
  };
}

async function handleEvent(
  pg: Pool,
  payload: EventPayload,
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
): Promise<void> {
  const { event, userId } = payload;

  if (!userId) {
    logger.error({ payload }, 'Event missing userId, skipping');
    return;
  }

  // Route based on event type
  switch (event) {
    case 'send.notification': {
      const channel = payload.channel;

      // Only process whatsapp or both
      if (channel !== 'whatsapp' && channel !== 'both') {
        return;
      }

      const template = payload.template;
      const data = payload.data ? JSON.parse(payload.data) : {};

      switch (template) {
        case 'morning_plan':
          await sendMorningPlan(pg, userId, data as MealPlanTemplateData);
          break;

        case 'cart_ready':
          await sendCartReady(pg, userId, data as CartSummaryTemplateData);
          break;

        case 'cook_instructions':
          await sendCookInstructions(pg, userId, data as CookInstructionsTemplateData);
          break;

        case 'evening_feedback':
          await sendEveningFeedback(pg, userId);
          break;

        default:
          logger.info({ template }, 'Unknown notification template, skipping');
      }
      break;
    }

    case 'plan.generated': {
      // Extract meal plan data from the event
      const planData = payload.data ? JSON.parse(payload.data) : payload;

      const mealPlanTemplate: MealPlanTemplateData = {
        userName: '', // Will be looked up by outgoing handler
        planDate: (planData as Record<string, string>).planDate || new Date().toISOString().split('T')[0],
        meals: ((planData as Record<string, unknown>).meals as MealPlanTemplateData['meals']) || [],
        dailyTotals: ((planData as Record<string, unknown>).dailyTotals as MealPlanTemplateData['dailyTotals']) || {
          calories: 0,
          proteinG: 0,
          fiberG: 0,
          carbsG: 0,
          fatG: 0,
        },
      };

      await sendMorningPlan(pg, userId, mealPlanTemplate);
      break;
    }

    case 'cart.ready': {
      const cartData = payload.data ? JSON.parse(payload.data) : payload;

      const cartTemplate: CartSummaryTemplateData = {
        items: ((cartData as Record<string, unknown>).items as CartSummaryTemplateData['items']) || [],
        unavailable: ((cartData as Record<string, unknown>).unavailable as string[]) || [],
        subtotal: Number((cartData as Record<string, unknown>).subtotal) || 0,
        deliveryFee: Number((cartData as Record<string, unknown>).deliveryFee) || 0,
        total: Number((cartData as Record<string, unknown>).total) || 0,
        platform: String((cartData as Record<string, unknown>).platform || 'blinkit'),
        deliveryEstimate: String((cartData as Record<string, unknown>).deliveryEstimate || '15-20 min'),
      };

      if ((cartData as Record<string, unknown>).couponCode) {
        cartTemplate.couponCode = String((cartData as Record<string, unknown>).couponCode);
        cartTemplate.discount = Number((cartData as Record<string, unknown>).discount) || 0;
      }

      await sendCartReady(pg, userId, cartTemplate);
      break;
    }

    case 'order.placed': {
      const orderData = payload.data
        ? (JSON.parse(payload.data) as Record<string, unknown>)
        : (payload as unknown as Record<string, unknown>);

      const confirmationTemplate: OrderConfirmationTemplateData = {
        orderId: String(orderData.orderId || ''),
        platform: String(orderData.platform || 'blinkit'),
        total: Number(orderData.total) || 0,
        deliveryEstimate: String(orderData.deliveryEstimate || '15-20 min'),
        checkoutUrl: String(orderData.checkoutUrl || ''),
      };

      await sendOrderConfirmation(pg, userId, confirmationTemplate);
      break;
    }

    default:
      // Ignore events we don't handle
      break;
  }
}

export async function startEventConsumer(
  redis: Redis,
  pg: Pool,
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void }
): Promise<() => void> {
  let running = true;

  // Ensure the consumer group exists
  try {
    await redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
    logger.info({ group: CONSUMER_GROUP, stream: STREAM_KEY }, 'Consumer group created');
  } catch (err: unknown) {
    const error = err as Error;
    // Group already exists — that's fine
    if (!error.message?.includes('BUSYGROUP')) {
      throw err;
    }
    logger.info({ group: CONSUMER_GROUP }, 'Consumer group already exists');
  }

  // Process pending messages first (messages claimed but not ACKed from previous runs)
  async function processPending(): Promise<void> {
    try {
      const results = await redis.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        CONSUMER_NAME,
        'COUNT',
        String(BATCH_SIZE),
        'STREAMS',
        STREAM_KEY,
        '0'
      );

      if (!results || results.length === 0) return;

      const [, entries] = results[0] as [string, [string, string[]][]];

      if (entries.length === 0) return;

      for (const entry of entries) {
        const parsed = parseStreamEntry(entry);
        const payload = parsePayload(parsed.fields);

        try {
          await handleEvent(pg, payload, logger);
          await redis.xack(STREAM_KEY, CONSUMER_GROUP, parsed.id);
        } catch (err) {
          logger.error({ err, entryId: parsed.id }, 'Error processing pending event');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error reading pending messages');
    }
  }

  // Main consumer loop
  async function consume(): Promise<void> {
    // Process any pending messages from previous runs
    await processPending();

    while (running) {
      try {
        const results = await redis.xreadgroup(
          'GROUP',
          CONSUMER_GROUP,
          CONSUMER_NAME,
          'COUNT',
          String(BATCH_SIZE),
          'BLOCK',
          String(BLOCK_MS),
          'STREAMS',
          STREAM_KEY,
          '>'
        );

        if (!results || results.length === 0) continue;

        const [, entries] = results[0] as [string, [string, string[]][]];

        for (const entry of entries) {
          const parsed = parseStreamEntry(entry);
          const payload = parsePayload(parsed.fields);

          try {
            await handleEvent(pg, payload, logger);
            await redis.xack(STREAM_KEY, CONSUMER_GROUP, parsed.id);
          } catch (err) {
            logger.error({ err, entryId: parsed.id }, 'Error processing event');
            // Message stays unACKed and will be retried on next restart
          }
        }
      } catch (err) {
        if (!running) break;
        logger.error({ err }, 'Error in event consumer loop');
        // Wait before retrying to avoid tight error loop
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  // Start consuming in the background
  consume().catch((err) => {
    logger.error({ err }, 'Event consumer crashed');
  });

  logger.info('Redis stream event consumer started');

  // Return a stop function
  return () => {
    running = false;
  };
}
