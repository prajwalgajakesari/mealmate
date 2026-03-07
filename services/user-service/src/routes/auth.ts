import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import admin from 'firebase-admin';
import { config } from '../config';
import {
  signupSchema,
  firebaseAuthSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../validators/user';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.firebaseProjectId,
  });
}

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/auth/signup
   * Register a new user with a Firebase token.
   * Verifies the Firebase token, creates the user in the DB, returns JWT pair.
   */
  fastify.post('/api/v1/auth/signup', async (request, reply) => {
    const parseResult = signupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
      });
    }

    const { firebaseToken, name } = parseResult.data;

    // Verify Firebase token
    let firebaseUser: admin.auth.DecodedIdToken;
    try {
      firebaseUser = await admin.auth().verifyIdToken(firebaseToken);
    } catch (err) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid Firebase token',
      });
    }

    const firebaseUid = firebaseUser.uid;
    const email = firebaseUser.email || null;
    const phone = firebaseUser.phone_number || null;

    // Check if user already exists
    const existing = await fastify.pg.query(
      'SELECT id FROM auth.users WHERE firebase_uid = $1',
      [firebaseUid]
    );

    if (existing.rows.length > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'User already exists. Use /login instead.',
      });
    }

    // Create user
    const insertResult = await fastify.pg.query(
      `INSERT INTO auth.users (firebase_uid, email, phone, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [firebaseUid, email, phone, name]
    );

    const user = insertResult.rows[0];
    const tokenPair = await fastify.generateTokenPair(user.id, user.email);

    return reply.status(201).send({
      statusCode: 201,
      data: {
        userId: user.id,
        ...tokenPair,
      },
    });
  });

  /**
   * POST /api/v1/auth/login
   * Login with a Firebase token.
   * Verifies the token, finds the user, returns JWT pair.
   */
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parseResult = firebaseAuthSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
      });
    }

    const { firebaseToken } = parseResult.data;

    // Verify Firebase token
    let firebaseUser: admin.auth.DecodedIdToken;
    try {
      firebaseUser = await admin.auth().verifyIdToken(firebaseToken);
    } catch (err) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid Firebase token',
      });
    }

    // Find user by Firebase UID
    const result = await fastify.pg.query(
      'SELECT id, email FROM auth.users WHERE firebase_uid = $1',
      [firebaseUser.uid]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found. Please sign up first.',
      });
    }

    const user = result.rows[0];
    const tokenPair = await fastify.generateTokenPair(user.id, user.email);

    return reply.status(200).send({
      statusCode: 200,
      data: {
        userId: user.id,
        ...tokenPair,
      },
    });
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh the access token using a valid refresh token.
   * Implements token rotation: old token is revoked, new pair is issued.
   */
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const parseResult = refreshTokenSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { refreshToken } = parseResult.data;
    const tokenPair = await fastify.rotateRefreshToken(refreshToken);

    if (!tokenPair) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      data: tokenPair,
    });
  });

  /**
   * POST /api/v1/auth/logout
   * Revoke the provided refresh token.
   */
  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    const parseResult = logoutSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { refreshToken } = parseResult.data;
    await fastify.revokeRefreshToken(refreshToken);

    return reply.status(200).send({
      statusCode: 200,
      message: 'Logged out successfully',
    });
  });
};

export default authRoutes;
