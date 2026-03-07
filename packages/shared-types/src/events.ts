export type EventType =
  | 'plan.generated'
  | 'plan.approved'
  | 'cart.ready'
  | 'order.approved'
  | 'order.placed'
  | 'order.delivered'
  | 'send.notification';

export type NotificationChannel = 'push' | 'whatsapp' | 'both';
export type NotificationTemplate = 'morning_plan' | 'cart_ready' | 'evening_feedback' | 'cook_instructions';

export interface BaseEvent {
  event: EventType;
  userId: string;
  timestamp: string;
}

export interface PlanGeneratedEvent extends BaseEvent {
  event: 'plan.generated';
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

export interface CartReadyEvent extends BaseEvent {
  event: 'cart.ready';
  orderId: string;
  platform: string;
  itemCount: number;
  total: number;
  checkoutUrl?: string;
}

export interface SendNotificationEvent extends BaseEvent {
  event: 'send.notification';
  channel: NotificationChannel;
  template: NotificationTemplate;
  data: Record<string, unknown>;
}

export type MealMateEvent =
  | PlanGeneratedEvent
  | CartReadyEvent
  | SendNotificationEvent;
