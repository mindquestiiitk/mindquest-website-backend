/**
 * Test utilities
 * Helper functions for tests
 */
import { db, auth } from '../src/config/firebase.config.js';
import { withRetry } from '../src/utils/firebase-utils.js';
import request from 'supertest';
import app from '../src/app.js';

/**
 * Create a test user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
export const createTestUser = async (userData) => {
  try {
    // Create user in Firebase Auth
    await withRetry(async () => {
      try {
        await auth.createUser({
          uid: userData.uid,
          email: userData.email,
          password: userData.password,
          displayName: userData.name,
        });
      } catch (error) {
        // Ignore if user already exists
        if (error.code !== 'auth/uid-already-exists' && 
            error.code !== 'auth/email-already-exists') {
          throw error;
        }
      }
    });

    // Create user in Firestore
    await withRetry(async () => {
      await db.collection('users').doc(userData.uid).set({
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    return { ...userData };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

/**
 * Create a test admin
 * @param {Object} adminData - Admin data
 * @returns {Promise<Object>} Created admin
 */
export const createTestAdmin = async (adminData) => {
  try {
    // Create admin user
    const user = await createTestUser({
      ...adminData,
      role: 'admin',
    });

    // Add to admins collection
    await withRetry(async () => {
      await db.collection('admins').doc(adminData.uid).set({
        email: adminData.email,
        createdAt: new Date().toISOString(),
      });
    });

    return user;
  } catch (error) {
    console.error('Error creating test admin:', error);
    throw error;
  }
};

/**
 * Get an authentication token for a user
 * @param {string} uid - User ID
 * @param {Object} claims - Custom claims
 * @returns {Promise<string>} Authentication token
 */
export const getAuthToken = async (uid, claims = {}) => {
  try {
    // Create custom token
    const customToken = await auth.createCustomToken(uid, claims);
    
    // Exchange for ID token
    const response = await request(app)
      .post('/auth/token')
      .send({ idToken: customToken });
    
    if (!response.body.success) {
      throw new Error('Failed to get auth token');
    }
    
    return response.body.data.token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
};

/**
 * Create a test event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
export const createTestEvent = async (eventData) => {
  try {
    const eventId = eventData.id || `test-event-${Date.now()}`;
    
    // Create event in Firestore
    await withRetry(async () => {
      await db.collection('events').doc(eventId).set({
        ...eventData,
        id: eventId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    
    return { 
      ...eventData,
      id: eventId,
    };
  } catch (error) {
    console.error('Error creating test event:', error);
    throw error;
  }
};

/**
 * Clean up test data
 * @param {Object} options - Cleanup options
 * @returns {Promise<boolean>} Success status
 */
export const cleanupTestData = async (options = {}) => {
  try {
    const { users = [], events = [], roles = [] } = options;
    
    // Clean up users
    for (const user of users) {
      try {
        await auth.deleteUser(user.uid);
      } catch (error) {
        console.warn(`Could not delete auth user ${user.uid}:`, error.message);
      }
      
      try {
        await db.collection('users').doc(user.uid).delete();
      } catch (error) {
        console.warn(`Could not delete user doc ${user.uid}:`, error.message);
      }
      
      try {
        await db.collection('admins').doc(user.uid).delete();
      } catch (error) {
        console.warn(`Could not delete admin doc ${user.uid}:`, error.message);
      }
    }
    
    // Clean up events
    for (const event of events) {
      try {
        await db.collection('events').doc(event.id).delete();
      } catch (error) {
        console.warn(`Could not delete event ${event.id}:`, error.message);
      }
    }
    
    // Clean up roles
    for (const role of roles) {
      try {
        await db.collection('event_roles').doc(role.id).delete();
      } catch (error) {
        console.warn(`Could not delete role ${role.id}:`, error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return false;
  }
};
