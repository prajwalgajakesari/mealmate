import Twilio from 'twilio';
import { config } from '../config';

const client = Twilio(config.twilioAccountSid, config.twilioAuthToken);

let lastSentAt = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastSentAt;
  const delay = config.outgoingRateLimitMs - elapsed;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export interface SendMessageResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export async function sendMessage(to: string, body: string): Promise<SendMessageResult> {
  await waitForRateLimit();

  const fromNumber = config.twilioWhatsappNumber.startsWith('whatsapp:')
    ? config.twilioWhatsappNumber
    : `whatsapp:${config.twilioWhatsappNumber}`;

  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body,
    });

    lastSentAt = Date.now();

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (err: unknown) {
    const error = err as Error & { code?: number; status?: number };

    // Twilio-specific error codes
    if (error.code === 21608) {
      return {
        success: false,
        error: 'Recipient has not opted in to receive WhatsApp messages',
      };
    }

    if (error.code === 21610) {
      return {
        success: false,
        error: 'Message delivery was blocked by recipient',
      };
    }

    if (error.code === 63016) {
      return {
        success: false,
        error: 'WhatsApp 24-hour session window expired. User must message first.',
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error: 'Twilio rate limit exceeded. Retry after a delay.',
      };
    }

    return {
      success: false,
      error: `Twilio API error: ${error.message || 'Unknown error'}`,
    };
  }
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return Twilio.validateRequest(config.twilioAuthToken, signature, url, params);
}
