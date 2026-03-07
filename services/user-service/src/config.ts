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
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: requireEnv('JWT_SECRET'),
  accessTokenExpiry: '15m',
  refreshTokenExpiryDays: 7,

  // Firebase
  firebaseProjectId: requireEnv('FIREBASE_PROJECT_ID'),

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

export type Config = typeof config;
