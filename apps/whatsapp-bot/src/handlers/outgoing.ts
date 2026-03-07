import { Pool } from 'pg';
import { sendMessage, SendMessageResult } from '../services/twilio-client';
import {
  formatMorningPlan,
  formatCartSummary,
  formatCookInstructions,
  formatEveningFeedback,
  formatOrderConfirmation,
  MealPlanTemplateData,
  CartSummaryTemplateData,
  CookInstructionsTemplateData,
  OrderConfirmationTemplateData,
} from '../templates/messages';

interface UserLookup {
  phone: string;
  name: string;
}

async function lookupUser(pg: Pool, userId: string): Promise<UserLookup | null> {
  const result = await pg.query<UserLookup>(
    'SELECT phone, name FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function sendToUser(
  pg: Pool,
  userId: string,
  messageBuilder: (user: UserLookup) => string
): Promise<SendMessageResult> {
  const user = await lookupUser(pg, userId);

  if (!user || !user.phone) {
    return {
      success: false,
      error: `User ${userId} not found or has no phone number`,
    };
  }

  const body = messageBuilder(user);
  return sendMessage(user.phone, body);
}

export async function sendMorningPlan(
  pg: Pool,
  userId: string,
  mealPlan: MealPlanTemplateData
): Promise<SendMessageResult> {
  return sendToUser(pg, userId, (user) =>
    formatMorningPlan({
      ...mealPlan,
      userName: user.name,
    })
  );
}

export async function sendCartReady(
  pg: Pool,
  userId: string,
  cartSummary: CartSummaryTemplateData
): Promise<SendMessageResult> {
  return sendToUser(pg, userId, () => formatCartSummary(cartSummary));
}

export async function sendCookInstructions(
  pg: Pool,
  userId: string,
  meals: CookInstructionsTemplateData
): Promise<SendMessageResult> {
  return sendToUser(pg, userId, () => formatCookInstructions(meals));
}

export async function sendEveningFeedback(
  pg: Pool,
  userId: string
): Promise<SendMessageResult> {
  return sendToUser(pg, userId, (user) => formatEveningFeedback(user.name));
}

export async function sendOrderConfirmation(
  pg: Pool,
  userId: string,
  data: OrderConfirmationTemplateData
): Promise<SendMessageResult> {
  return sendToUser(pg, userId, () => formatOrderConfirmation(data));
}
