import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Twilio
  twilioAccountSid: requireEnv('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: requireEnv('TWILIO_AUTH_TOKEN'),
  twilioWhatsappNumber: requireEnv('TWILIO_WHATSAPP_NUMBER'),

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Internal services
  mealEngineUrl: process.env.MEAL_ENGINE_URL || 'http://localhost:8001',
  orderOrchestratorUrl: process.env.ORDER_ORCHESTRATOR_URL || 'http://localhost:8003',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Rate limiting
  outgoingRateLimitMs: parseInt(process.env.OUTGOING_RATE_LIMIT_MS || '1000', 10),
} as const;

export type Config = typeof config;
