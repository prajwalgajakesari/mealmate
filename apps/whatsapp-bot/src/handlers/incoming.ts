import { FastifyInstance } from 'fastify';
import { config } from '../config';

export interface IncomingMessage {
  from: string;
  body: string;
  messageSid: string;
}

interface UserRecord {
  id: string;
  name: string;
}

async function lookupUserByPhone(
  fastify: FastifyInstance,
  phone: string
): Promise<UserRecord | null> {
  // Strip the "whatsapp:" prefix if present
  const cleanPhone = phone.replace(/^whatsapp:/, '');

  const result = await fastify.pg.query<UserRecord>(
    'SELECT id, name FROM users WHERE phone = $1',
    [cleanPhone]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function approveCart(
  fastify: FastifyInstance,
  userId: string
): Promise<string> {
  try {
    const response = await fetch(
      `${config.orderOrchestratorUrl}/api/v1/orders/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      fastify.log.error({ userId, status: response.status, errorBody }, 'Cart approval failed');
      return 'Order approval mein problem aayi. Please thodi der baad try karo.';
    }

    const data = (await response.json()) as { checkoutUrl?: string };
    if (data.checkoutUrl) {
      return `Order approved! Yahan se complete karo:\n${data.checkoutUrl}`;
    }

    return 'Order approved! Aapko jaldi hi delivery details milenge.';
  } catch (err) {
    fastify.log.error({ err, userId }, 'Error approving cart');
    return 'Order approval mein problem aayi. Please thodi der baad try karo.';
  }
}

async function requestMealSwap(
  fastify: FastifyInstance,
  userId: string
): Promise<string> {
  try {
    const response = await fetch(
      `${config.mealEngineUrl}/api/v1/plans/swap-options`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      fastify.log.error({ userId, status: response.status }, 'Swap options fetch failed');
      return 'Swap options laane mein problem aayi. Please app se try karo.';
    }

    const data = (await response.json()) as {
      options?: Array<{ type: string; name: string }>;
    };

    if (!data.options || data.options.length === 0) {
      return 'Abhi swap options available nahi hain. Please app se try karo.';
    }

    const optionsList = data.options
      .map((opt, i) => `${i + 1}. *${opt.type}:* ${opt.name}`)
      .join('\n');

    return `Yeh hain aaj ke alternative options:\n\n${optionsList}\n\nReply with the number to swap.`;
  } catch (err) {
    fastify.log.error({ err, userId }, 'Error fetching swap options');
    return 'Swap options laane mein problem aayi. Please app se try karo.';
  }
}

async function processFeedback(
  fastify: FastifyInstance,
  userId: string,
  feedbackText: string,
  rating?: number
): Promise<string> {
  try {
    const response = await fetch(
      `${config.mealEngineUrl}/api/v1/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          feedbackText,
          rating,
          source: 'whatsapp',
        }),
      }
    );

    if (!response.ok) {
      fastify.log.error({ userId, status: response.status }, 'Feedback submission failed');
      return 'Feedback save karne mein problem aayi. Phir bhi shukriya!';
    }

    return 'Shukriya! Aapka feedback mil gaya. Kal ka plan aur accha banega!';
  } catch (err) {
    fastify.log.error({ err, userId }, 'Error submitting feedback');
    return 'Feedback save karne mein problem aayi. Phir bhi shukriya!';
  }
}

function isThumbsUp(text: string): boolean {
  return /^(\u{1F44D}|\u{1F44D}\u{1F3FB}|\u{1F44D}\u{1F3FC}|\u{1F44D}\u{1F3FD}|\u{1F44D}\u{1F3FE}|\u{1F44D}\u{1F3FF}|\+1|thumbs\s*up)$/iu.test(
    text.trim()
  );
}

function isThumbsDown(text: string): boolean {
  return /^(\u{1F44E}|\u{1F44E}\u{1F3FB}|\u{1F44E}\u{1F3FC}|\u{1F44E}\u{1F3FD}|\u{1F44E}\u{1F3FE}|\u{1F44E}\u{1F3FF}|-1|thumbs\s*down)$/iu.test(
    text.trim()
  );
}

export async function handleIncomingMessage(
  fastify: FastifyInstance,
  message: IncomingMessage
): Promise<string> {
  const user = await lookupUserByPhone(fastify, message.from);

  if (!user) {
    return 'Aapka number register nahi hai. Please MealMate app se signup karo.';
  }

  const body = message.body.trim();
  const upperBody = body.toUpperCase();

  // Cart approval
  if (upperBody === 'YES' || upperBody === 'ORDER') {
    return approveCart(fastify, user.id);
  }

  // Meal swap
  if (upperBody === 'CHANGE') {
    return requestMealSwap(fastify, user.id);
  }

  // Emoji feedback
  if (isThumbsUp(body)) {
    return processFeedback(fastify, user.id, 'Liked the meal', 5);
  }

  if (isThumbsDown(body)) {
    return processFeedback(fastify, user.id, 'Did not like the meal', 1);
  }

  // Numeric rating (1-5)
  const numericRating = parseInt(body, 10);
  if (!isNaN(numericRating) && numericRating >= 1 && numericRating <= 5 && body.length <= 2) {
    return processFeedback(fastify, user.id, `Rating: ${numericRating}`, numericRating);
  }

  // Free text — treat as feedback
  return processFeedback(fastify, user.id, body);
}
