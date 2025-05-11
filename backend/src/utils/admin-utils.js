/**
 * Utility functions for admin management
 */

import { db } from "../config/firebase.config.js";

/**
 * Add a user to the admins collection
 * @param {string} userId - The user ID to add as admin
 * @param {Object} userData - Additional user data (email, name, etc.)
 * @returns {Promise<Object>} - The created admin document
 */
export async function addUserToAdmins(userId, userData = {}) {
  try {
    // Get user data if not provided
    if (!userData.email || !userData.name) {
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      userData = {
        ...userData,
        ...userDoc.data()
      };
    }
    
    // Create admin document
    const adminDocRef = db.collection("admins").doc(userId);
    const adminData = {
      userId,
      email: userData.email,
      name: userData.name || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await adminDocRef.set(adminData);
    
    return {
      id: userId,
      ...adminData
    };
  } catch (error) {
    console.error(`Error adding user ${userId} to admins:`, error);
    throw error;
  }
}

/**
 * Remove a user from the admins collection
 * @param {string} userId - The user ID to remove from admins
 * @returns {Promise<void>}
 */
export async function removeUserFromAdmins(userId) {
  try {
    const adminDocRef = db.collection("admins").doc(userId);
    const adminDoc = await adminDocRef.get();
    
    if (!adminDoc.exists) {
      throw new Error(`User ${userId} is not an admin`);
    }
    
    await adminDocRef.delete();
  } catch (error) {
    console.error(`Error removing user ${userId} from admins:`, error);
    throw error;
  }
}

/**
 * Check if a user is in the admins collection
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if the user is an admin
 */
export async function isUserAdmin(userId) {
  try {
    const adminDocRef = db.collection("admins").doc(userId);
    const adminDoc = await adminDocRef.get();
    
    return adminDoc.exists;
  } catch (error) {
    console.error(`Error checking if user ${userId} is admin:`, error);
    throw error;
  }
}

/**
 * Get all admin users
 * @returns {Promise<Array>} - Array of admin documents
 */
export async function getAllAdmins() {
  try {
    const adminsSnapshot = await db.collection("admins").get();
    
    return adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting all admins:", error);
    throw error;
  }
}
