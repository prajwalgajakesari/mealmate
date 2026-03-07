export interface MealPlanTemplateData {
  userName: string;
  planDate: string;
  meals: Array<{
    type: string;
    name: string;
    calories: number;
    proteinG: number;
    prepTimeMin: number;
  }>;
  dailyTotals: {
    calories: number;
    proteinG: number;
    fiberG: number;
    carbsG: number;
    fatG: number;
  };
}

export interface CartSummaryTemplateData {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  unavailable: string[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  couponCode?: string;
  total: number;
  platform: string;
  deliveryEstimate: string;
}

export interface CookInstructionsTemplateData {
  meals: Array<{
    type: string;
    name: string;
    ingredients: Array<{
      name: string;
      quantity: string;
    }>;
    steps: string[];
  }>;
}

export interface OrderConfirmationTemplateData {
  orderId: string;
  platform: string;
  total: number;
  deliveryEstimate: string;
  checkoutUrl: string;
}

function getMealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
  };
  return labels[type] || type;
}

function getMealTypeHindi(type: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Nashta',
    lunch: 'Lunch',
    dinner: 'Dinner',
  };
  return labels[type] || type;
}

function formatPrice(amount: number): string {
  return `Rs. ${amount.toFixed(0)}`;
}

function formatPlatformName(platform: string): string {
  const names: Record<string, string> = {
    swiggy_instamart: 'Swiggy Instamart',
    blinkit: 'Blinkit',
    zepto: 'Zepto',
  };
  return names[platform] || platform;
}

export function formatMorningPlan(data: MealPlanTemplateData): string {
  const greeting = `*Namaste ${data.userName}!* Good morning!\n\nAaj ka meal plan ready hai (${data.planDate}):`;

  const mealLines = data.meals
    .map((meal) => {
      const label = getMealTypeLabel(meal.type);
      return `*${label}:* ${meal.name}\n   ${meal.calories} cal | ${meal.proteinG}g protein | ${meal.prepTimeMin} min`;
    })
    .join('\n\n');

  const totals = [
    `\n*Daily Total:*`,
    `   Calories: ${data.dailyTotals.calories} kcal`,
    `   Protein: ${data.dailyTotals.proteinG}g`,
    `   Carbs: ${data.dailyTotals.carbsG}g`,
    `   Fat: ${data.dailyTotals.fatG}g`,
    `   Fiber: ${data.dailyTotals.fiberG}g`,
  ].join('\n');

  const footer = `\nReply *CHANGE* to swap any meal.`;

  return [greeting, mealLines, totals, footer].join('\n\n');
}

export function formatCartSummary(data: CartSummaryTemplateData): string {
  const header = `*Your grocery cart is ready!*\n*Platform:* ${formatPlatformName(data.platform)}`;

  const itemLines = data.items
    .map((item, i) => `${i + 1}. ${item.name} x${item.quantity} - ${formatPrice(item.price)}`)
    .join('\n');

  const unavailableSection =
    data.unavailable.length > 0
      ? `\n*Not available:*\n${data.unavailable.map((name) => `- ${name} (skipped)`).join('\n')}`
      : '';

  const pricingLines = [`\n*Subtotal:* ${formatPrice(data.subtotal)}`];

  if (data.couponCode && data.discount) {
    pricingLines.push(`*Coupon (${data.couponCode}):* -${formatPrice(data.discount)}`);
  }

  pricingLines.push(`*Delivery:* ${formatPrice(data.deliveryFee)}`);
  pricingLines.push(`*Total:* ${formatPrice(data.total)}`);
  pricingLines.push(`*Delivery:* ${data.deliveryEstimate}`);

  const footer = `\nReply *YES* to order or *CHANGE* to modify.`;

  return [header, itemLines, unavailableSection, pricingLines.join('\n'), footer]
    .filter(Boolean)
    .join('\n\n');
}

export function formatCookInstructions(data: CookInstructionsTemplateData): string {
  const sections = data.meals.map((meal) => {
    const header = `*Aaj ka ${getMealTypeHindi(meal.type)}: ${meal.name}*`;

    const ingredients = [
      '',
      '*Saamaan:*',
      ...meal.ingredients.map((ing) => `- ${ing.name} - ${ing.quantity}`),
    ].join('\n');

    const steps = [
      '',
      '*Banane ka tarika:*',
      ...meal.steps.map((step, i) => `${i + 1}. ${step}`),
    ].join('\n');

    return [header, ingredients, steps].join('\n');
  });

  return sections.join('\n\n---\n\n');
}

export function formatEveningFeedback(userName: string): string {
  return [
    `*${userName}, aaj ka khana kaisa laga?*`,
    '',
    'Please rate each meal:',
    '',
    '- Reply with a number (1-5) for each meal',
    '- Or send a thumbs up/down emoji',
    '- Or just tell us in your own words!',
    '',
    'Your feedback helps us plan better meals for tomorrow.',
  ].join('\n');
}

export function formatOrderConfirmation(data: OrderConfirmationTemplateData): string {
  return [
    '*Order confirmed!*',
    '',
    `*Order ID:* ${data.orderId}`,
    `*Platform:* ${formatPlatformName(data.platform)}`,
    `*Total:* ${formatPrice(data.total)}`,
    `*Delivery:* ${data.deliveryEstimate}`,
    '',
    `Complete your order here:`,
    data.checkoutUrl,
    '',
    'Aapka saamaan jaldi aa jayega!',
  ].join('\n');
}
