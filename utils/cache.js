/**
 * Redis Cache Utility
 * ===================
 * Simple cache wrapper using ioredis.
 * Falls back gracefully if Redis is not configured.
 */

let redis = null;

function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000
    });
    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));
  }
  return redis;
}

// Set cache with TTL in seconds
async function setCache(key, data, ttlSeconds = 300) {
  try {
    const client = getRedis();
    if (!client) return false;
    await client.setex(`aparaitech:${key}`, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Cache set error:', err.message);
    return false;
  }
}

// Get cached data
async function getCache(key) {
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get(`aparaitech:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err.message);
    return null;
  }
}

// Delete cache key
async function delCache(key) {
  try {
    const client = getRedis();
    if (!client) return false;
    await client.del(`aparaitech:${key}`);
    return true;
  } catch (err) {
    return false;
  }
}

// Delete all keys matching a pattern
async function delCachePattern(pattern) {
  try {
    const client = getRedis();
    if (!client) return false;
    const keys = await client.keys(`aparaitech:${pattern}*`);
    if (keys.length > 0) await client.del(...keys);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { getRedis, setCache, getCache, delCache, delCachePattern };
