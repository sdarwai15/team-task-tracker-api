import { redis } from '../config/redis';

const CACHE_TTL = 300; // 5 minutes

/**
 * Cache key strategy:
 * tasks:assignee:{userId}        - all tasks assigned to a user
 * tasks:org:{orgId}              - all tasks in an org (for ADMIN/MANAGER list)
 *
 * Invalidation strategy: write-invalidate
 * On any task create/update/delete - delete the affected cache keys immediately.
 * Next read rebuilds the cache from DB.
 * Simple, consistent, no stale reads.
 */

export const CacheKey = {
  tasksByAssignee: (userId: string) => `tasks:assignee:${userId}`,
  tasksByOrg: (orgId: string) => `tasks:org:${orgId}`,
};

// ── Get ────────────────────────────────────────────────────────────────────

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    // Cache miss on error — degrade gracefully, never crash
    console.error('[cache] GET error:', err);
    return null;
  }
};

// ── Set ────────────────────────────────────────────────────────────────────

export const setCache = async <T>(key: string, value: T, ttl = CACHE_TTL): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error('[cache] SET error:', err);
  }
};

// ── Invalidate ─────────────────────────────────────────────────────────────

export const invalidateCache = async (...keys: string[]): Promise<void> => {
  try {
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error('[cache] DEL error:', err);
  }
};

// ── Invalidate all task caches for an org + assignee ──────────────────────

export const invalidateTaskCaches = async (
  orgId: string,
  assigneeId?: string | null,
): Promise<void> => {
  const keys = [CacheKey.tasksByOrg(orgId)];
  if (assigneeId) {
    keys.push(CacheKey.tasksByAssignee(assigneeId));
  }
  await invalidateCache(...keys);
};
