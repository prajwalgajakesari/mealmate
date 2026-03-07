import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  updateProfileSchema,
  updateDietarySchema,
  updateGoalsSchema,
} from '../validators/user';
import { calculateNutritionTargets, HealthGoal } from '../services/nutrition-calculator';

/**
 * Maps a database row (snake_case) to a camelCase user profile object.
 */
function mapUserRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email || undefined,
    phone: row.phone || undefined,
    name: row.name,
    heightCm: row.height_cm || undefined,
    weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
    age: row.age || undefined,
    gender: row.gender || undefined,
    activityLevel: row.activity_level,
    healthGoal: row.health_goal,
    calorieTarget: row.calorie_target,
    proteinTargetG: row.protein_target_g,
    fiberTargetG: row.fiber_target_g,
    carbTargetG: row.carb_target_g,
    fatTargetG: row.fat_target_g,
    dietType: row.diet_type,
    cuisinePreferences: row.cuisine_preferences || [],
    allergies: row.allergies || [],
    ingredientBlacklist: row.ingredient_blacklist || [],
    breakfastStyle: row.breakfast_style,
    lunchStyle: row.lunch_style,
    dinnerStyle: row.dinner_style,
    hasCook: row.has_cook,
    cookSkillLevel: row.cook_skill_level,
    preferredPlatform: row.preferred_platform,
    deliveryAddress: row.delivery_address || undefined,
    planDeliveryTime: row.plan_delivery_time || undefined,
    planType: row.plan_type,
    planExpiresAt: row.plan_expires_at
      ? (row.plan_expires_at as Date).toISOString()
      : undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // All user routes require authentication
  fastify.addHook('onRequest', requireAuth);

  /**
   * GET /api/v1/users/me
   * Get the authenticated user's profile.
   */
  fastify.get('/api/v1/users/me', async (request, reply) => {
    const userId = request.currentUser!.userId;

    const result = await fastify.pg.query(
      'SELECT * FROM auth.users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      data: mapUserRow(result.rows[0]),
    });
  });

  /**
   * PUT /api/v1/users/me
   * Update the authenticated user's profile.
   * If body stats or health goal change, nutrition targets are recalculated.
   */
  fastify.put('/api/v1/users/me', async (request, reply) => {
    const userId = request.currentUser!.userId;

    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    if (Object.keys(data).length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    // Map camelCase input to snake_case DB columns
    const fieldMap: Record<string, string> = {
      name: 'name',
      heightCm: 'height_cm',
      weightKg: 'weight_kg',
      age: 'age',
      gender: 'gender',
      activityLevel: 'activity_level',
      healthGoal: 'health_goal',
      dietType: 'diet_type',
      cuisinePreferences: 'cuisine_preferences',
      allergies: 'allergies',
      ingredientBlacklist: 'ingredient_blacklist',
      breakfastStyle: 'breakfast_style',
      lunchStyle: 'lunch_style',
      dinnerStyle: 'dinner_style',
      hasCook: 'has_cook',
      cookSkillLevel: 'cook_skill_level',
      preferredPlatform: 'preferred_platform',
      deliveryAddress: 'delivery_address',
      planDeliveryTime: 'plan_delivery_time',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const [camelKey, dbColumn] of Object.entries(fieldMap)) {
      const value = (data as Record<string, unknown>)[camelKey];
      if (value !== undefined) {
        if (camelKey === 'deliveryAddress') {
          setClauses.push(`${dbColumn} = $${paramIdx}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${dbColumn} = $${paramIdx}`);
          values.push(value);
        }
        paramIdx++;
      }
    }

    // Check if body stats or health goal changed, triggering nutrition recalculation
    const bodyStatsFields = ['heightCm', 'weightKg', 'age', 'gender', 'activityLevel', 'healthGoal'];
    const bodyStatsChanged = bodyStatsFields.some(
      (f) => (data as Record<string, unknown>)[f] !== undefined
    );

    if (bodyStatsChanged) {
      // Fetch current user to merge with updates
      const currentUser = await fastify.pg.query(
        'SELECT height_cm, weight_kg, age, gender, activity_level, health_goal FROM auth.users WHERE id = $1',
        [userId]
      );

      if (currentUser.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const current = currentUser.rows[0];
      const merged = {
        heightCm: data.heightCm ?? current.height_cm,
        weightKg: data.weightKg ?? (current.weight_kg ? Number(current.weight_kg) : undefined),
        age: data.age ?? current.age,
        gender: data.gender ?? current.gender,
        activityLevel: data.activityLevel ?? current.activity_level,
      };
      const healthGoal = (data.healthGoal ?? current.health_goal) as HealthGoal;

      const targets = calculateNutritionTargets(merged, healthGoal);
      if (targets) {
        setClauses.push(`calorie_target = $${paramIdx}`);
        values.push(targets.calorieTarget);
        paramIdx++;

        setClauses.push(`protein_target_g = $${paramIdx}`);
        values.push(targets.proteinTargetG);
        paramIdx++;

        setClauses.push(`carb_target_g = $${paramIdx}`);
        values.push(targets.carbTargetG);
        paramIdx++;

        setClauses.push(`fat_target_g = $${paramIdx}`);
        values.push(targets.fatTargetG);
        paramIdx++;

        setClauses.push(`fiber_target_g = $${paramIdx}`);
        values.push(targets.fiberTargetG);
        paramIdx++;
      }
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(userId);
    const query = `
      UPDATE auth.users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *
    `;

    const result = await fastify.pg.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      data: mapUserRow(result.rows[0]),
    });
  });

  /**
   * PUT /api/v1/users/me/dietary
   * Update dietary preferences only.
   */
  fastify.put('/api/v1/users/me/dietary', async (request, reply) => {
    const userId = request.currentUser!.userId;

    const parseResult = updateDietarySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    if (Object.keys(data).length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    const fieldMap: Record<string, string> = {
      dietType: 'diet_type',
      cuisinePreferences: 'cuisine_preferences',
      allergies: 'allergies',
      ingredientBlacklist: 'ingredient_blacklist',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const [camelKey, dbColumn] of Object.entries(fieldMap)) {
      const value = (data as Record<string, unknown>)[camelKey];
      if (value !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE auth.users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *
    `;

    const result = await fastify.pg.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      data: mapUserRow(result.rows[0]),
    });
  });

  /**
   * PUT /api/v1/users/me/goals
   * Update health goals and body stats.
   * Automatically recalculates nutrition targets.
   */
  fastify.put('/api/v1/users/me/goals', async (request, reply) => {
    const userId = request.currentUser!.userId;

    const parseResult = updateGoalsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    if (Object.keys(data).length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    // Fetch current user to merge stats
    const currentUser = await fastify.pg.query(
      'SELECT height_cm, weight_kg, age, gender, activity_level, health_goal FROM auth.users WHERE id = $1',
      [userId]
    );

    if (currentUser.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const current = currentUser.rows[0];
    const merged = {
      heightCm: data.heightCm ?? current.height_cm,
      weightKg: data.weightKg ?? (current.weight_kg ? Number(current.weight_kg) : undefined),
      age: data.age ?? current.age,
      gender: data.gender ?? current.gender,
      activityLevel: data.activityLevel ?? current.activity_level,
    };
    const healthGoal = (data.healthGoal ?? current.health_goal) as HealthGoal;

    const fieldMap: Record<string, string> = {
      heightCm: 'height_cm',
      weightKg: 'weight_kg',
      age: 'age',
      gender: 'gender',
      activityLevel: 'activity_level',
      healthGoal: 'health_goal',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const [camelKey, dbColumn] of Object.entries(fieldMap)) {
      const value = (data as Record<string, unknown>)[camelKey];
      if (value !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    // Calculate and include nutrition targets
    const targets = calculateNutritionTargets(merged, healthGoal);
    if (targets) {
      setClauses.push(`calorie_target = $${paramIdx}`);
      values.push(targets.calorieTarget);
      paramIdx++;

      setClauses.push(`protein_target_g = $${paramIdx}`);
      values.push(targets.proteinTargetG);
      paramIdx++;

      setClauses.push(`carb_target_g = $${paramIdx}`);
      values.push(targets.carbTargetG);
      paramIdx++;

      setClauses.push(`fat_target_g = $${paramIdx}`);
      values.push(targets.fatTargetG);
      paramIdx++;

      setClauses.push(`fiber_target_g = $${paramIdx}`);
      values.push(targets.fiberTargetG);
      paramIdx++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE auth.users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *
    `;

    const result = await fastify.pg.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      data: mapUserRow(result.rows[0]),
    });
  });

  /**
   * DELETE /api/v1/users/me
   * Delete the authenticated user's account.
   * Revokes all refresh tokens and deletes the user (cascade).
   */
  fastify.delete('/api/v1/users/me', async (request, reply) => {
    const userId = request.currentUser!.userId;

    // Revoke all tokens first
    await fastify.revokeAllUserTokens(userId);

    // Delete user (cascades to refresh_tokens, meal_plans, etc.)
    const result = await fastify.pg.query(
      'DELETE FROM auth.users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Invalidate cached user data in Redis
    try {
      await fastify.redis.del(`user:${userId}`);
    } catch {
      // Non-critical; log and continue
      fastify.log.warn(`Failed to clear Redis cache for user ${userId}`);
    }

    return reply.status(200).send({
      statusCode: 200,
      message: 'Account deleted successfully',
    });
  });
};

export default userRoutes;
