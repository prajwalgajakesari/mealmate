import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { query } from '../plugins/database';
import { getCartCache, setCartCache, publishEvent } from '../plugins/redis';
import { SmartCartBuilder, CartBuildResult } from '../services/cart-builder';
import { getPlatformRouter } from '../services/platform-router';
import { config } from '../config';

// ---- Zod Schemas ----

const buildCartBodySchema = z.object({
  mealPlanId: z.string().uuid(),
  groceryItems: z.array(
    z.object({
      name: z.string().min(1),
      searchTerm: z.string().min(1),
      quantity: z.string().min(1),
      category: z.string().min(1),
      priority: z.string().default('must_have'),
    })
  ).min(1),
  platform: z
    .enum(['swiggy_instamart', 'blinkit', 'zepto'])
    .optional(),
});

const approveOrderParamsSchema = z.object({
  order_id: z.string().uuid(),
});

const orderStatusParamsSchema = z.object({
  order_id: z.string().uuid(),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---- Helpers ----

function getUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'] as string;
  if (!userId) {
    throw { statusCode: 401, message: 'Missing X-User-Id header' };
  }
  return userId;
}

// ---- Routes ----

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/orders/cart — Get current cart summary for user
   */
  fastify.get(
    '/api/v1/orders/cart',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      // Try Redis cache first
      const cached = await getCartCache(userId);
      if (cached) {
        return reply.send({
          success: true,
          data: cached,
          source: 'cache',
        });
      }

      // Fall back to latest cart_ready order from DB
      const result = await query(
        `SELECT * FROM orders.grocery_orders
         WHERE user_id = $1 AND status = 'cart_ready'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'No active cart found',
        });
      }

      const order = result.rows[0] as Record<string, unknown>;
      const cartSummary = {
        orderId: order.id,
        items: order.items,
        subtotal: order.subtotal,
        coupon: order.coupon_applied
          ? { code: order.coupon_applied, discount: order.discount }
          : undefined,
        deliveryFee:
          (order.subtotal as number) >= config.cart.freeDeliveryThreshold
            ? 0
            : config.cart.deliveryFee,
        total: order.total,
        platform: order.platform,
        status: order.status,
        createdAt: order.created_at,
      };

      return reply.send({
        success: true,
        data: cartSummary,
        source: 'database',
      });
    }
  );

  /**
   * POST /api/v1/orders/build — Build cart from meal plan's grocery list
   */
  fastify.post(
    '/api/v1/orders/build',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof buildCartBodySchema> }>,
      reply: FastifyReply
    ) => {
      const userId = getUserId(request);

      // Validate body
      const parseResult = buildCartBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: parseResult.error.issues,
        });
      }

      const { mealPlanId, groceryItems, platform } = parseResult.data;

      // Fetch pantry decisions
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
              ingredients: groceryItems.map((g) => ({
                name: g.name,
                quantity: g.quantity,
                category: g.category,
              })),
            }),
          }
        );

        if (pantryResponse.ok) {
          const pantryResult = await pantryResponse.json() as {
            decisions: Array<{
              ingredient_name: string;
              should_order: boolean;
              reason: string;
              category: string;
              suggested_qty?: string;
            }>;
          };
          pantryDecisions = (pantryResult.decisions ?? []).map((d) => ({
            ingredientName: d.ingredient_name,
            shouldOrder: d.should_order,
            reason: d.reason,
            category: d.category,
            suggestedQty: d.suggested_qty,
          }));
        }
      } catch (error) {
        console.warn('[Orders] Pantry service unreachable, ordering all items:', error);
      }

      // Build the cart
      const router = getPlatformRouter();
      const adapter = platform
        ? router.getAdapter(platform)
        : router.getPreferredAdapter();

      const cartBuilder = new SmartCartBuilder();
      let cartResult: CartBuildResult;

      try {
        cartResult = await cartBuilder.buildCart(
          groceryItems,
          pantryDecisions,
          adapter
        );
      } catch (error) {
        console.error('[Orders] Cart build failed:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to build cart',
        });
      }

      // Persist to database
      try {
        await query(
          `INSERT INTO orders.grocery_orders
            (id, user_id, meal_plan_id, platform, items, subtotal, total, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'cart_ready')`,
          [
            cartResult.orderId,
            userId,
            mealPlanId,
            cartResult.platform,
            JSON.stringify(cartResult.items),
            cartResult.subtotal,
            cartResult.total,
          ]
        );
      } catch (dbError) {
        console.error('[Orders] Failed to persist order:', dbError);
        return reply.status(500).send({
          success: false,
          error: 'Failed to save order',
        });
      }

      // Cache in Redis
      const cacheData = {
        ...cartResult,
        mealPlanId,
        userId,
        status: 'cart_ready',
        createdAt: new Date().toISOString(),
      };
      await setCartCache(userId, cacheData);

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

      return reply.status(201).send({
        success: true,
        data: cartResult,
      });
    }
  );

  /**
   * PUT /api/v1/orders/:order_id/approve — User approves order, generate checkout URL
   */
  fastify.put(
    '/api/v1/orders/:order_id/approve',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof approveOrderParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const userId = getUserId(request);

      const paramsResult = approveOrderParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid order_id',
        });
      }

      const { order_id } = paramsResult.data;

      // Fetch order
      const orderResult = await query(
        `SELECT * FROM orders.grocery_orders
         WHERE id = $1 AND user_id = $2`,
        [order_id, userId]
      );

      if (orderResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found',
        });
      }

      const order = orderResult.rows[0] as Record<string, unknown>;

      if (order.status !== 'cart_ready') {
        return reply.status(409).send({
          success: false,
          error: `Order cannot be approved in '${order.status}' status`,
        });
      }

      // Generate checkout URL
      const router = getPlatformRouter();
      const adapter = router.getAdapter(
        order.platform as 'swiggy_instamart' | 'blinkit' | 'zepto'
      );
      const checkoutUrl = await adapter.getCheckoutUrl();

      // Update order status
      await query(
        `UPDATE orders.grocery_orders
         SET status = 'user_approved', checkout_url = $1, updated_at = NOW()
         WHERE id = $2`,
        [checkoutUrl, order_id]
      );

      // Update cache
      await setCartCache(userId, {
        ...(order as Record<string, unknown>),
        status: 'user_approved',
        checkoutUrl,
        updatedAt: new Date().toISOString(),
      });

      // Publish order.approved event
      await publishEvent({
        event: 'order.approved' as const,
        userId,
        orderId: order_id,
        timestamp: new Date().toISOString(),
      });

      return reply.send({
        success: true,
        data: {
          orderId: order_id,
          status: 'user_approved',
          checkoutUrl,
          platform: order.platform,
        },
      });
    }
  );

  /**
   * GET /api/v1/orders/:order_id/status — Order status
   */
  fastify.get(
    '/api/v1/orders/:order_id/status',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof orderStatusParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const userId = getUserId(request);

      const paramsResult = orderStatusParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid order_id',
        });
      }

      const { order_id } = paramsResult.data;

      const result = await query(
        `SELECT id, user_id, meal_plan_id, platform, items, subtotal,
                coupon_applied, discount, total, status, platform_order_id,
                checkout_url, created_at, updated_at
         FROM orders.grocery_orders
         WHERE id = $1 AND user_id = $2`,
        [order_id, userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found',
        });
      }

      const order = result.rows[0] as Record<string, unknown>;

      return reply.send({
        success: true,
        data: {
          orderId: order.id,
          mealPlanId: order.meal_plan_id,
          platform: order.platform,
          items: order.items,
          subtotal: order.subtotal,
          couponApplied: order.coupon_applied,
          discount: order.discount,
          total: order.total,
          status: order.status,
          platformOrderId: order.platform_order_id,
          checkoutUrl: order.checkout_url,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
        },
      });
    }
  );

  /**
   * GET /api/v1/orders/history — Past orders
   */
  fastify.get(
    '/api/v1/orders/history',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof historyQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const userId = getUserId(request);

      const queryResult = historyQuerySchema.safeParse(request.query);
      const { limit, offset } = queryResult.success
        ? queryResult.data
        : { limit: 10, offset: 0 };

      const result = await query(
        `SELECT id, meal_plan_id, platform, items, subtotal,
                coupon_applied, discount, total, status,
                checkout_url, created_at, updated_at
         FROM orders.grocery_orders
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*)::int as total FROM orders.grocery_orders WHERE user_id = $1',
        [userId]
      );

      const totalCount = (countResult.rows[0] as Record<string, unknown>)?.total ?? 0;

      const orders = result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          orderId: r.id,
          mealPlanId: r.meal_plan_id,
          platform: r.platform,
          items: r.items,
          subtotal: r.subtotal,
          couponApplied: r.coupon_applied,
          discount: r.discount,
          total: r.total,
          status: r.status,
          checkoutUrl: r.checkout_url,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      });

      return reply.send({
        success: true,
        data: {
          orders,
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + limit < (totalCount as number),
          },
        },
      });
    }
  );
}
