/**
 * Firebase Performance Utilities
 * 
 * This module provides utilities for optimizing Firebase performance,
 * including caching, batching, and query optimization.
 */

import logger from './logger.js';
import config from '../config/config.js';

// In-memory cache for frequently accessed data
const cache = new Map();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Default TTL in milliseconds (5 minutes)
  DEFAULT_TTL: 5 * 60 * 1000,
  
  // Maximum cache size (number of entries)
  MAX_SIZE: 100,
  
  // Collections that should be cached
  CACHEABLE_COLLECTIONS: ['products', 'teams', 'events'],
  
  // Whether to enable caching
  ENABLED: true
};

/**
 * Cache entry with expiration
 */
class CacheEntry {
  constructor(data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.data = data;
    this.expiry = Date.now() + ttl;
  }
  
  isExpired() {
    return Date.now() > this.expiry;
  }
}

/**
 * Gets a value from the cache
 * @param {string} key - Cache key
 * @returns {*|null} - Cached value or null if not found or expired
 */
export function getCached(key) {
  if (!CACHE_CONFIG.ENABLED) {
    return null;
  }
  
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (entry.isExpired()) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Sets a value in the cache
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export function setCached(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
  if (!CACHE_CONFIG.ENABLED) {
    return;
  }
  
  // Enforce maximum cache size
  if (cache.size >= CACHE_CONFIG.MAX_SIZE) {
    // Remove oldest entry
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  cache.set(key, new CacheEntry(data, ttl));
}

/**
 * Clears the cache for a specific key or collection
 * @param {string} keyOrCollection - Cache key or collection name
 */
export function clearCache(keyOrCollection) {
  if (cache.has(keyOrCollection)) {
    // Clear specific key
    cache.delete(keyOrCollection);
  } else {
    // Clear all keys for a collection
    for (const key of cache.keys()) {
      if (key.startsWith(`${keyOrCollection}/`)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Generates a cache key for a Firestore query
 * @param {string} collectionPath - Collection path
 * @param {Object} queryParams - Query parameters
 * @returns {string} - Cache key
 */
export function generateCacheKey(collectionPath, queryParams = {}) {
  let key = collectionPath;
  
  if (Object.keys(queryParams).length > 0) {
    key += `?${JSON.stringify(queryParams)}`;
  }
  
  return key;
}

/**
 * Executes a Firestore query with caching
 * @param {string} collectionPath - Collection path
 * @param {Function} queryFn - Function that executes the query
 * @param {Object} queryParams - Query parameters for cache key generation
 * @param {Object} options - Cache options
 * @param {boolean} options.bypassCache - Whether to bypass the cache
 * @param {number} options.ttl - Cache TTL in milliseconds
 * @returns {Promise<*>} - Query result
 */
export async function executeQueryWithCache(collectionPath, queryFn, queryParams = {}, options = {}) {
  const { bypassCache = false, ttl = CACHE_CONFIG.DEFAULT_TTL } = options;
  
  // Check if collection is cacheable
  const isCacheable = CACHE_CONFIG.CACHEABLE_COLLECTIONS.includes(collectionPath.split('/')[0]);
  
  if (!isCacheable || !CACHE_CONFIG.ENABLED || bypassCache) {
    return queryFn();
  }
  
  const cacheKey = generateCacheKey(collectionPath, queryParams);
  const cachedResult = getCached(cacheKey);
  
  if (cachedResult) {
    logger.debug('Cache hit', { collectionPath, cacheKey });
    return cachedResult;
  }
  
  logger.debug('Cache miss', { collectionPath, cacheKey });
  const result = await queryFn();
  
  setCached(cacheKey, result, ttl);
  return result;
}

/**
 * Optimizes a Firestore query based on common patterns
 * @param {Object} query - Firestore query
 * @param {Object} options - Optimization options
 * @returns {Object} - Optimized query
 */
export function optimizeQuery(query, options = {}) {
  // Add optimizations based on query patterns
  // This is a placeholder for future optimizations
  return query;
}

/**
 * Firestore index recommendations
 * This provides guidance on which indexes to create for common queries
 */
export const RECOMMENDED_INDEXES = [
  {
    collection: 'products',
    fields: ['category', 'price'],
    description: 'For filtering products by category and sorting by price'
  },
  {
    collection: 'events',
    fields: ['date', 'category'],
    description: 'For filtering events by date and category'
  },
  {
    collection: 'orders',
    fields: ['userId', 'createdAt'],
    description: 'For filtering orders by user and sorting by creation date'
  }
];

/**
 * Logs recommendations for missing indexes
 * This should be called during application startup
 */
export function logIndexRecommendations() {
  if (config.isDevelopment) {
    logger.info('Firestore index recommendations:', { 
      indexes: RECOMMENDED_INDEXES 
    });
  }
}
