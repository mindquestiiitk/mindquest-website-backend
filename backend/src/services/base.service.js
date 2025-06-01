/**
 * Base Service class providing common service patterns
 * Enhanced with model factory pattern and performance optimizations
 */

import { BaseModel } from "../models/base.model.js";
import { handleFirebaseError } from "../utils/error.js";
import logger from "../utils/logger.js";
import {
  getCached,
  setCached,
  getOrSetCached,
  deleteCached,
  invalidateCache,
} from "../utils/firebase-cache.js";

// Model factory for efficient model instance management
class ModelFactory {
  constructor() {
    this.models = new Map();
    this.modelStats = new Map();
  }

  getModel(collectionName, options = {}) {
    const cacheKey = `${collectionName}-${JSON.stringify(options)}`;

    if (this.models.has(cacheKey)) {
      this.updateStats(cacheKey, "hit");
      return this.models.get(cacheKey);
    }

    const model = new BaseModel(collectionName, options);
    this.models.set(cacheKey, model);
    this.updateStats(cacheKey, "miss");

    logger.debug("Model factory cache miss - created new model", {
      collectionName,
      cacheKey,
      totalModels: this.models.size,
    });

    return model;
  }

  updateStats(cacheKey, type) {
    if (!this.modelStats.has(cacheKey)) {
      this.modelStats.set(cacheKey, {
        hits: 0,
        misses: 0,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });
    }

    const stats = this.modelStats.get(cacheKey);
    stats[type === "hit" ? "hits" : "misses"]++;
    stats.lastAccessed = new Date().toISOString();
  }

  getStats() {
    const totalHits = Array.from(this.modelStats.values()).reduce(
      (sum, stats) => sum + stats.hits,
      0
    );
    const totalMisses = Array.from(this.modelStats.values()).reduce(
      (sum, stats) => sum + stats.misses,
      0
    );
    const totalRequests = totalHits + totalMisses;
    const hitRate =
      totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) : 0;

    return {
      totalModels: this.models.size,
      totalRequests,
      totalHits,
      totalMisses,
      hitRate: `${hitRate}%`,
    };
  }
}

// Singleton model factory instance
const modelFactory = new ModelFactory();

export class BaseService {
  constructor(collectionName, options = {}) {
    this.collectionName = collectionName;
    this.model = modelFactory.getModel(collectionName, options);
    this.cacheNamespace = `service:${collectionName}`;
  }

  /**
   * Create a new entity
   * @param {Object} data - Entity data
   * @param {string} [id] - Optional entity ID
   * @returns {Promise<Object>} Created entity
   */
  async create(data, id = null) {
    try {
      logger.info(`Creating ${this.collectionName} entity`, { data, id });
      const result = await this.model.create(data, id);
      logger.debug(`${this.collectionName} entity created`, { id: result.id });
      return result;
    } catch (error) {
      logger.error(`Failed to create ${this.collectionName} entity`, {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Get entity by ID with caching
   * @param {string} id - Entity ID
   * @param {Object} options - Options including cache settings
   * @returns {Promise<Object|null>} Entity data or null if not found
   */
  async getById(id, options = {}) {
    try {
      logger.debug(`Getting ${this.collectionName} entity by ID`, { id });

      // Use cache for read operations
      const result = await getOrSetCached(
        this.cacheNamespace,
        `getById:${id}`,
        async () => {
          const data = await this.model.findById(id);
          if (!data) {
            logger.warn(`${this.collectionName} entity not found`, { id });
          }
          return data;
        },
        options.cacheTTL || 5 * 60 * 1000 // 5 minutes default
      );

      return result;
    } catch (error) {
      logger.error(`Failed to get ${this.collectionName} entity`, {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Update entity by ID with cache invalidation
   * @param {string} id - Entity ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated entity
   */
  async update(id, data) {
    try {
      logger.info(`Updating ${this.collectionName} entity`, { id, data });
      const result = await this.model.update(id, data);

      // Invalidate cache for this entity
      deleteCached(this.cacheNamespace, `getById:${id}`);

      // Invalidate related caches (getAll, findWhere, etc.)
      invalidateCache(`${this.cacheNamespace}:getAll*`);
      invalidateCache(`${this.cacheNamespace}:findWhere*`);

      logger.debug(
        `${this.collectionName} entity updated and cache invalidated`,
        { id }
      );
      return result;
    } catch (error) {
      logger.error(`Failed to update ${this.collectionName} entity`, {
        error: error.message,
        id,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      logger.info(`Deleting ${this.collectionName} entity`, { id });
      const result = await this.model.delete(id);
      logger.debug(`${this.collectionName} entity deleted`, { id });
      return result;
    } catch (error) {
      logger.error(`Failed to delete ${this.collectionName} entity`, {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get all entities
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of entities
   */
  async getAll(options = {}) {
    try {
      logger.debug(`Getting all ${this.collectionName} entities`, { options });
      const result = await this.model.findAll(options);
      logger.debug(
        `Retrieved ${result.length} ${this.collectionName} entities`
      );
      return result;
    } catch (error) {
      logger.error(`Failed to get all ${this.collectionName} entities`, {
        error: error.message,
        options,
      });
      throw error;
    }
  }

  /**
   * Find entities by field value
   * @param {string} field - Field name
   * @param {string} operator - Comparison operator
   * @param {*} value - Field value
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching entities
   */
  async findWhere(field, operator, value, options = {}) {
    try {
      logger.debug(`Querying ${this.collectionName} entities`, {
        field,
        operator,
        value,
        options,
      });
      const result = await this.model.findWhere(
        field,
        operator,
        value,
        options
      );
      logger.debug(`Found ${result.length} ${this.collectionName} entities`);
      return result;
    } catch (error) {
      logger.error(`Failed to query ${this.collectionName} entities`, {
        error: error.message,
        field,
        operator,
        value,
        options,
      });
      throw error;
    }
  }

  /**
   * Count entities
   * @param {Object} whereClause - Optional where clause
   * @returns {Promise<number>} Entity count
   */
  async count(whereClause = null) {
    try {
      logger.debug(`Counting ${this.collectionName} entities`, { whereClause });
      const result = await this.model.count(whereClause);
      logger.debug(`${this.collectionName} entity count: ${result}`);
      return result;
    } catch (error) {
      logger.error(`Failed to count ${this.collectionName} entities`, {
        error: error.message,
        whereClause,
      });
      throw error;
    }
  }

  /**
   * Check if entity exists
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} Whether entity exists
   */
  async exists(id) {
    try {
      const entity = await this.getById(id);
      return entity !== null;
    } catch (error) {
      logger.error(`Failed to check if ${this.collectionName} entity exists`, {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get entities with pagination
   * @param {Object} options - Pagination options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {string} [options.orderBy] - Field to order by
   * @param {string} [options.direction='asc'] - Order direction
   * @returns {Promise<Object>} Paginated results
   */
  async paginate(options = {}) {
    try {
      const { page = 1, limit = 10, orderBy, direction = "asc" } = options;
      const offset = (page - 1) * limit;

      logger.debug(`Paginating ${this.collectionName} entities`, {
        page,
        limit,
        offset,
        orderBy,
        direction,
      });

      // Get total count
      const totalCount = await this.count();

      // Get paginated results
      const queryOptions = {
        limit,
        orderBy,
        direction,
      };

      const entities = await this.getAll(queryOptions);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: entities,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      };
    } catch (error) {
      logger.error(`Failed to paginate ${this.collectionName} entities`, {
        error: error.message,
        options,
      });
      throw error;
    }
  }

  /**
   * Get model factory statistics
   * @returns {Object} - Model factory statistics
   */
  static getModelFactoryStats() {
    return modelFactory.getStats();
  }

  /**
   * Get cache namespace for this service
   * @returns {string} - Cache namespace
   */
  getCacheNamespace() {
    return this.cacheNamespace;
  }
}

// Export model factory for external access
export { modelFactory };
