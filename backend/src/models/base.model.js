import { db } from "../config/firebase.config.js";
import { withRetry } from "../utils/firebase-utils.js";
import { handleFirebaseError } from "../utils/error.js";
import logger from "../utils/logger.js";

/**
 * Base Model class providing common CRUD operations for Firestore collections
 * Uses retry logic and proper error handling
 */
export class BaseModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @param {string} [id] - Optional document ID
   * @returns {Promise<Object>} Created document with ID
   */
  async create(data, id = null) {
    try {
      const timestamp = new Date().toISOString();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      let docRef;
      if (id) {
        docRef = this.collection.doc(id);
        await withRetry(() => docRef.set(documentData));
        return { id, ...documentData };
      } else {
        docRef = await withRetry(() => this.collection.add(documentData));
        return { id: docRef.id, ...documentData };
      }
    } catch (error) {
      logger.error(`Failed to create document in ${this.collectionName}`, {
        error: error.message,
        data,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document data or null if not found
   */
  async findById(id) {
    try {
      const doc = await withRetry(() => this.collection.doc(id).get());
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(`Failed to find document in ${this.collectionName}`, {
        error: error.message,
        id,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated document
   */
  async update(id, data) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await withRetry(() => this.collection.doc(id).update(updateData));

      // Return the updated document
      return await this.findById(id);
    } catch (error) {
      logger.error(`Failed to update document in ${this.collectionName}`, {
        error: error.message,
        id,
        data,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      await withRetry(() => this.collection.doc(id).delete());
      return true;
    } catch (error) {
      logger.error(`Failed to delete document in ${this.collectionName}`, {
        error: error.message,
        id,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Find all documents in collection
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Limit number of results
   * @param {string} [options.orderBy] - Field to order by
   * @param {string} [options.direction] - Order direction ('asc' or 'desc')
   * @returns {Promise<Array>} Array of documents
   */
  async findAll(options = {}) {
    try {
      let query = this.collection;

      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.direction || "asc");
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await withRetry(() => query.get());
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error(`Failed to find all documents in ${this.collectionName}`, {
        error: error.message,
        options,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Find documents by field value
   * @param {string} field - Field name
   * @param {string} operator - Comparison operator
   * @param {*} value - Field value
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching documents
   */
  async findWhere(field, operator, value, options = {}) {
    try {
      let query = this.collection.where(field, operator, value);

      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.direction || "asc");
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await withRetry(() => query.get());
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error(`Failed to query documents in ${this.collectionName}`, {
        error: error.message,
        field,
        operator,
        value,
        options,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Count documents in collection
   * @param {Object} whereClause - Optional where clause
   * @returns {Promise<number>} Document count
   */
  async count(whereClause = null) {
    try {
      let query = this.collection;

      if (whereClause) {
        query = query.where(
          whereClause.field,
          whereClause.operator,
          whereClause.value
        );
      }

      const snapshot = await withRetry(() => query.count().get());
      return snapshot.data().count;
    } catch (error) {
      logger.error(`Failed to count documents in ${this.collectionName}`, {
        error: error.message,
        whereClause,
      });
      throw handleFirebaseError(error);
    }
  }
}
