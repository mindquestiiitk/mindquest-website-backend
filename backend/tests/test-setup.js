/**
 * Test Setup
 * Sets up the test environment
 */
import { db, auth } from '../src/config/firebase.config.js';
import { AuthService } from '../src/services/auth.service.js';
import { EventsService } from '../src/services/events.service.js';
import { EventRoleService } from '../src/services/event-role.service.js';
import { withRetry } from '../src/utils/firebase-utils.js';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';

// Test data
export const TEST_ADMIN = {
  email: 'test-admin@example.com',
  password: 'Password123!',
  uid: 'test-admin-uid',
  name: 'Test Admin',
};

export const TEST_USER = {
  email: 'test-user@example.com',
  password: 'Password123!',
  uid: 'test-user-uid',
  name: 'Test User',
};

export const TEST_EVENT = {
  id: 'test-event-id',
  title: 'Test Event',
  date: '2025-06-15',
  description: 'Test event description',
  location: 'Online',
  images: ['https://example.com/image.jpg'],
};

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
 * Generate a test token
 * @param {Object} user - User data
 * @returns {string} JWT token
 */
export const generateTestToken = (user) => {
  const authService = new AuthService();
  return authService.generateToken(user);
};

/**
 * Create a test event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
export const createTestEvent = async (eventData) => {
  try {
    const eventsService = new EventsService();
    const event = await eventsService.createEvent(eventData);
    return event;
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
    
    // Clean up roles
    for (const role of roles) {
      try {
        await db.collection('event_roles').doc(role.id).delete();
      } catch (error) {
        console.warn(`Could not delete role ${role.id}:`, error.message);
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
    
    // Clean up users
    for (const user of users) {
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
      
      try {
        await auth.deleteUser(user.uid);
      } catch (error) {
        console.warn(`Could not delete auth user ${user.uid}:`, error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return false;
  }
};

/**
 * Setup test environment
 * @returns {Promise<Object>} Test environment
 */
export const setupTestEnvironment = async () => {
  try {
    // Create test admin
    const admin = await createTestAdmin(TEST_ADMIN);
    
    // Create test user
    const user = await createTestUser(TEST_USER);
    
    // Create test event
    const event = await createTestEvent(TEST_EVENT);
    
    // Generate admin token
    const adminToken = generateTestToken({
      id: admin.uid,
      email: admin.email,
      name: admin.name,
      role: 'admin',
    });
    
    return {
      admin,
      user,
      event,
      adminToken,
    };
  } catch (error) {
    console.error('Error setting up test environment:', error);
    throw error;
  }
};
