import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config';

export interface JwtPayload {
  sub: string; // user id
  email?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    generateTokenPair: (userId: string, email?: string) => Promise<TokenPair>;
    rotateRefreshToken: (oldToken: string) => Promise<TokenPair | null>;
    revokeRefreshToken: (token: string) => Promise<void>;
    revokeAllUserTokens: (userId: string) => Promise<void>;
  }
}

const REFRESH_TOKEN_SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000;

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.accessTokenExpiry,
    },
  });

  // Generate a new access + refresh token pair
  async function generateTokenPair(userId: string, email?: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = fastify.jwt.sign(payload);

    // Generate a random refresh token
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    // Store hashed refresh token in DB
    await fastify.pg.query(
      `INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  // Rotate: verify old refresh token, revoke it, issue new pair
  async function rotateRefreshToken(oldToken: string): Promise<TokenPair | null> {
    // Fetch all non-revoked, non-expired tokens
    const { rows } = await fastify.pg.query(
      `SELECT id, user_id, token_hash, expires_at
       FROM auth.refresh_tokens
       WHERE revoked = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`
    );

    // Find the matching token by comparing hashes
    for (const row of rows) {
      const isMatch = await bcrypt.compare(oldToken, row.token_hash);
      if (isMatch) {
        // Revoke the old token
        await fastify.pg.query(
          `UPDATE auth.refresh_tokens SET revoked = TRUE WHERE id = $1`,
          [row.id]
        );

        // Get user email for the new token
        const userResult = await fastify.pg.query(
          `SELECT email FROM auth.users WHERE id = $1`,
          [row.user_id]
        );
        const email = userResult.rows[0]?.email;

        // Generate new pair
        return generateTokenPair(row.user_id, email);
      }
    }

    return null;
  }

  // Revoke a specific refresh token
  async function revokeRefreshToken(token: string): Promise<void> {
    const { rows } = await fastify.pg.query(
      `SELECT id, token_hash FROM auth.refresh_tokens
       WHERE revoked = FALSE AND expires_at > NOW()`
    );

    for (const row of rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        await fastify.pg.query(
          `UPDATE auth.refresh_tokens SET revoked = TRUE WHERE id = $1`,
          [row.id]
        );
        return;
      }
    }
  }

  // Revoke all refresh tokens for a user (e.g., on delete account)
  async function revokeAllUserTokens(userId: string): Promise<void> {
    await fastify.pg.query(
      `UPDATE auth.refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`,
      [userId]
    );
  }

  fastify.decorate('generateTokenPair', generateTokenPair);
  fastify.decorate('rotateRefreshToken', rotateRefreshToken);
  fastify.decorate('revokeRefreshToken', revokeRefreshToken);
  fastify.decorate('revokeAllUserTokens', revokeAllUserTokens);
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['database'],
});
