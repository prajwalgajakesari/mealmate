import {
  ensureConsumerGroup,
  readFromStream,
  ackMessage,
  publishEvent,
  setCartCache,
} from '../plugins/redis';
import { query } from '../plugins/database';
import { SmartCartBuilder } from './cart-builder';
import { getPlatformRouter } from './platform-router';
import { config } from '../config';

interface PlanGeneratedPayload {
  event: 'plan.generated';
  userId: string;
  planId: string;
  planDate: string;
  groceryNeeded: Array<{
    name: string;
    searchTerm: string;
    quantity: string;
    category: string;
    priority: string;
  }>;
}

interface OrderApprovedPayload {
  event: 'order.approved';
  userId: string;
  orderId: string;
}

let isRunning = false;
let shouldStop = false;

/**
 * Start the Redis stream consumer loop.
 * Listens to "mealmate:events" for events relevant to order orchestration.
 */
export async function startEventConsumer(): Promise<void> {
  if (isRunning) {
    console.warn('[EventConsumer] Already running');
    return;
  }

  try {
    await ensureConsumerGroup();
  } catch (error) {
    console.error('[EventConsumer] Failed to ensure consumer group:', error);
    throw error;
  }

  isRunning = true;
  shouldStop = false;
  console.log('[EventConsumer] Started listening for events');

  // Run consumer loop
  consumeLoop().catch((err) => {
    console.error('[EventConsumer] Fatal error in consume loop:', err);
    isRunning = false;
  });
}

export function stopEventConsumer(): void {
  console.log('[EventConsumer] Stopping...');
  shouldStop = true;
  isRunning = false;
}

async function consumeLoop(): Promise<void> {
  while (!shouldStop) {
    try {
      const messages = await readFromStream(10, 5000);

      for (const message of messages) {
        try {
          await processMessage(message.id, message.fields);
          await ackMessage(message.id);
        } catch (error) {
          console.error(
            `[EventConsumer] Error processing message ${message.id}:`,
            error
          );
          // Don't ack — message will be retried via pending entries
        }
      }
    } catch (error) {
      console.error('[EventConsumer] Error reading from stream:', error);
      // Back off on connection errors
      if (!shouldStop) {
        await sleep(2000);
      }
    }
  }

  console.log('[EventConsumer] Stopped');
}

async function processMessage(
  messageId: string,
  fields: Record<string, string>
): Promise<void> {
  const eventType = fields.event;
  const data = fields.data ? JSON.parse(fields.data) : fields;

  console.log(`[EventConsumer] Processing event: ${eventType} (${messageId})`);

  switch (eventType) {
    case 'plan.generated':
      await handlePlanGenerated(data as PlanGeneratedPayload);
      break;

    case 'order.approved':
      await handleOrderApproved(data as OrderApprovedPayload);
      break;

    default:
      // Ignore events not relevant to order orchestrator
      break;
  }
}

/**
 * Handle plan.generated event — automatically build a cart from the grocery list.
 */
async function handlePlanGenerated(payload: PlanGeneratedPayload): Promise<void> {
  const { userId, planId, groceryNeeded } = payload;
  console.log(
    `[EventConsumer] Plan generated for user ${userId}, ${groceryNeeded.length} grocery items`
  );

  if (!groceryNeeded || groceryNeeded.length === 0) {
    console.log('[EventConsumer] No grocery items needed, skipping cart build');
    return;
  }

  // Fetch pantry decisions from Pantry Tracker service
  let pantryDecisions: Array<{
    ingredientName: string;
    shouldOrder: boolean;
    reason: string;
    category: string;
    suggestedQty?: string;
  }> = [];

  try {
    const pantryResponse = await fetch(
      `${config.services.pantryTrackerUrl}/api/v1/pantry/check-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          ingredients: groceryNeeded.map((g) => ({
            name: g.name,
            quantity: g.quantity,
            category: g.category,
          })),
        }),
      }
    );

    if (pantryResponse.ok) {
      const pantryResult = await pantryResponse.json() as { decisions: typeof pantryDecisions };
      pantryDecisions = pantryResult.decisions ?? [];
    } else {
      console.warn(
        `[EventConsumer] Pantry check failed (${pantryResponse.status}), ordering all items`
      );
    }
  } catch (error) {
    console.warn('[EventConsumer] Pantry service unreachable, ordering all items:', error);
  }

  // Build the cart
  const router = getPlatformRouter();
  const adapter = router.getPreferredAdapter(); // MVP: always swiggy
  const cartBuilder = new SmartCartBuilder();

  const cartResult = await cartBuilder.buildCart(
    groceryNeeded,
    pantryDecisions,
    adapter
  );

  // Persist order to database
  try {
    const orderRow = await query(
      `INSERT INTO orders.grocery_orders
        (id, user_id, meal_plan_id, platform, items, subtotal, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'cart_ready')
       RETURNING id`,
      [
        cartResult.orderId,
        userId,
        planId,
        cartResult.platform,
        JSON.stringify(cartResult.items),
        cartResult.subtotal,
        cartResult.total,
      ]
    );
    console.log(`[EventConsumer] Order persisted: ${orderRow.rows[0]?.id}`);
  } catch (dbError) {
    console.error('[EventConsumer] Failed to persist order:', dbError);
  }

  // Cache cart in Redis
  await setCartCache(userId, {
    ...cartResult,
    mealPlanId: planId,
    createdAt: new Date().toISOString(),
  });

  // Publish cart.ready event
  await publishEvent({
    event: 'cart.ready',
    userId,
    orderId: cartResult.orderId,
    platform: cartResult.platform,
    itemCount: cartResult.itemCount,
    total: cartResult.total,
    timestamp: new Date().toISOString(),
  });

  // Publish notification event
  await publishEvent({
    event: 'send.notification',
    userId,
    channel: 'both',
    template: 'cart_ready',
    data: {
      itemCount: cartResult.itemCount,
      total: cartResult.total,
      platform: cartResult.platform,
      unavailableCount: cartResult.unavailableItems.length,
    },
    timestamp: new Date().toISOString(),
  });

  console.log(`[EventConsumer] Cart ready event published for order ${cartResult.orderId}`);
}

/**
 * Handle order.approved event — generate checkout URL.
 */
async function handleOrderApproved(payload: OrderApprovedPayload): Promise<void> {
  const { userId, orderId } = payload;
  console.log(`[EventConsumer] Order approved: ${orderId} by user ${userId}`);

  // Fetch order from DB
  const orderResult = await query(
    'SELECT * FROM orders.grocery_orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    console.error(`[EventConsumer] Order ${orderId} not found`);
    return;
  }

  const order = orderResult.rows[0] as Record<string, unknown>;

  // Generate checkout URL via platform adapter
  const router = getPlatformRouter();
  const adapter = router.getAdapter(order.platform as 'swiggy_instamart' | 'blinkit' | 'zepto');
  const checkoutUrl = await adapter.getCheckoutUrl();

  // Update order in DB
  await query(
    `UPDATE orders.grocery_orders
     SET status = 'user_approved', checkout_url = $1, updated_at = NOW()
     WHERE id = $2`,
    [checkoutUrl, orderId]
  );

  // Update cache
  await setCartCache(userId, {
    ...(order as Record<string, unknown>),
    status: 'user_approved',
    checkoutUrl,
  });

  console.log(`[EventConsumer] Checkout URL generated for order ${orderId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
