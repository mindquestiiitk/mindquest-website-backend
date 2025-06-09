/**
 * Firebase Caching Utilities
 * 
 * Production-ready caching system for Firebase operations
 * Provides namespace-based caching with TTL, LRU eviction, and cache invalidation
 */

import logger from "./logger.js";
import config from "../config/config.js";

// Cache configuration
const CACHE_CONFIG = {
  ENABLED: config.cache?.enabled !== false,
  MAX_SIZE: config.cache?.maxSize || 1000,
  DEFAULT_TTL: config.cache?.defaultTTL || 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: config.cache?.cleanupInterval || 60 * 1000, // 1 minute
  CACHEABLE_COLLECTIONS: [
    "products",
    "events", 
    "teams",
    "sales",
    "users",
    "admins",
    "superadmins"
  ],
};

// Cache entry class
class CacheEntry {
  constructor(data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.data = data;
    this.expiry = Date.now() + ttl;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
  }

  isExpired() {
    return Date.now() > this.expiry;
  }

  access() {
    this.lastAccessed = Date.now();
    this.accessCount++;
    return this.data;
  }
}

// Unified cache for all backend operations
const cache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0,
};

/**
 * Generate cache key with namespace and parameters
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {Object} params - Additional parameters
 * @returns {string} - Generated cache key
 */
function generateCacheKey(namespace, key, params = {}) {
  const paramString = Object.keys(params).length > 0 ? `-${JSON.stringify(params)}` : "";
  return `${namespace}:${key}${paramString}`;
}

/**
 * Get value from cache with namespace support
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {Object} params - Additional parameters
 * @returns {*|null} - Cached value or null if not found or expired
 */
export function getCached(namespace, key, params = {}) {
  if (!CACHE_CONFIG.ENABLED) {
    cacheStats.misses++;
    return null;
  }

  const cacheKey = generateCacheKey(namespace, key, params);
  const entry = cache.get(cacheKey);

  if (!entry) {
    cacheStats.misses++;
    return null;
  }

  if (entry.isExpired()) {
    cache.delete(cacheKey);
    cacheStats.misses++;
    cacheStats.evictions++;
    return null;
  }

  cacheStats.hits++;
  logger.debug("Cache hit", {
    namespace,
    key,
    cacheKey,
    accessCount: entry.accessCount,
  });
  return entry.access();
}

/**
 * Set value in cache with namespace support
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 * @param {Object} params - Additional parameters
 */
export function setCached(
  namespace,
  key,
  data,
  ttl = CACHE_CONFIG.DEFAULT_TTL,
  params = {}
) {
  if (!CACHE_CONFIG.ENABLED) {
    return;
  }

  const cacheKey = generateCacheKey(namespace, key, params);

  // Enforce maximum cache size with LRU eviction
  if (cache.size >= CACHE_CONFIG.MAX_SIZE) {
    evictLeastRecentlyUsed();
  }

  cache.set(cacheKey, new CacheEntry(data, ttl));
  cacheStats.sets++;

  logger.debug("Cache set", {
    namespace,
    key,
    cacheKey,
    ttl,
    size: cache.size,
  });
}

/**
 * Evict least recently used entries
 */
function evictLeastRecentlyUsed() {
  let oldestKey = null;
  let oldestTime = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    cacheStats.evictions++;
    logger.debug("Cache eviction", { evictedKey: oldestKey });
  }
}

/**
 * Delete value from cache with namespace support
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {Object} params - Additional parameters
 */
export function deleteCached(namespace, key, params = {}) {
  if (!CACHE_CONFIG.ENABLED) return;

  const cacheKey = generateCacheKey(namespace, key, params);
  const deleted = cache.delete(cacheKey);

  if (deleted) {
    cacheStats.deletes++;
    logger.debug("Cache delete", { namespace, key, cacheKey });
  }
}

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match (supports wildcards)
 */
export function invalidateCache(pattern) {
  if (!CACHE_CONFIG.ENABLED) return;

  const regex = new RegExp(pattern.replace(/\*/g, ".*"));
  const keysToDelete = [];

  for (const key of cache.keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    cache.delete(key);
    cacheStats.deletes++;
  });

  logger.debug("Cache invalidation", {
    pattern,
    deletedCount: keysToDelete.length,
  });
}

/**
 * Get or set pattern (cache-aside)
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live
 * @param {Object} params - Additional parameters
 * @returns {*} - Cached or fetched value
 */
export async function getOrSetCached(
  namespace,
  key,
  fetchFn,
  ttl = null,
  params = {}
) {
  // Try to get from cache first
  const cached = getCached(namespace, key, params);
  if (cached !== null) {
    return cached;
  }

  // Fetch data
  try {
    const data = await fetchFn();
    setCached(namespace, key, data, ttl, params);
    return data;
  } catch (error) {
    logger.error("Cache fetch error", {
      namespace,
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Execute a Firestore query with caching
 * @param {string} collectionPath - Collection path
 * @param {Function} queryFn - Function that executes the query
 * @param {Object} queryParams - Query parameters for cache key generation
 * @param {Object} options - Cache options
 * @param {boolean} options.bypassCache - Whether to bypass the cache
 * @param {number} options.ttl - Cache TTL in milliseconds
 * @returns {Promise<*>} - Query result
 */
export async function executeQueryWithCache(
  collectionPath,
  queryFn,
  queryParams = {},
  options = {}
) {
  const { bypassCache = false, ttl = CACHE_CONFIG.DEFAULT_TTL } = options;

  // Check if collection is cacheable
  const isCacheable = CACHE_CONFIG.CACHEABLE_COLLECTIONS.includes(
    collectionPath.split("/")[0]
  );

  if (!isCacheable || !CACHE_CONFIG.ENABLED || bypassCache) {
    return queryFn();
  }

  // Use enhanced cache functions
  return await getOrSetCached(
    "firestore",
    `${collectionPath}-${JSON.stringify(queryParams)}`,
    queryFn,
    ttl
  );
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export function getCacheStats() {
  const hitRate =
    cacheStats.hits + cacheStats.misses > 0
      ? (
          (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) *
          100
        ).toFixed(2)
      : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    size: cache.size,
    maxSize: CACHE_CONFIG.MAX_SIZE,
    enabled: CACHE_CONFIG.ENABLED,
  };
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.clear();
  Object.keys(cacheStats).forEach((key) => {
    cacheStats[key] = 0;
  });
  logger.info("All cache cleared");
}

/**
 * Cleanup expired entries
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => {
    cache.delete(key);
    cacheStats.evictions++;
  });

  if (expiredKeys.length > 0) {
    logger.debug("Cache cleanup", {
      expiredCount: expiredKeys.length,
      remainingSize: cache.size,
    });
  }
}

// Start cache cleanup interval
if (CACHE_CONFIG.ENABLED) {
  setInterval(cleanupExpiredCache, CACHE_CONFIG.CLEANUP_INTERVAL);
  logger.info("Cache cleanup interval started", {
    interval: `${CACHE_CONFIG.CLEANUP_INTERVAL / 1000}s`,
    maxSize: CACHE_CONFIG.MAX_SIZE,
    defaultTTL: `${CACHE_CONFIG.DEFAULT_TTL / 1000}s`,
  });
}
