/**
 * Script to migrate admin users from role-based to collection-based authorization
 * 
 * This script:
 * 1. Finds all users with role='admin' in the users collection
 * 2. Creates a document for each admin user in the admins collection
 * 3. Logs the migration results
 */

import { db } from "../config/firebase.config.js";
import { UserRole } from "../services/auth.service.js";

async function migrateAdmins() {
  console.log("Starting admin migration...");
  
  try {
    // Get all users with admin role
    const adminUsersSnapshot = await db.collection("users")
      .where("role", "==", UserRole.ADMIN)
      .get();
    
    console.log(`Found ${adminUsersSnapshot.size} admin users to migrate`);
    
    if (adminUsersSnapshot.empty) {
      console.log("No admin users found. Migration complete.");
      return;
    }
    
    // Process each admin user
    const migrationPromises = adminUsersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`Migrating admin user: ${userData.email} (${userId})`);
      
      // Check if admin document already exists
      const adminDocRef = db.collection("admins").doc(userId);
      const adminDoc = await adminDocRef.get();
      
      if (adminDoc.exists) {
        console.log(`Admin document already exists for user ${userId}`);
        return {
          userId,
          email: userData.email,
          status: "already_exists"
        };
      }
      
      // Create admin document
      await adminDocRef.set({
        userId,
        email: userData.email,
        name: userData.name || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Created admin document for user ${userId}`);
      
      return {
        userId,
        email: userData.email,
        status: "migrated"
      };
    });
    
    const results = await Promise.all(migrationPromises);
    
    // Log migration summary
    const migrated = results.filter(r => r.status === "migrated").length;
    const alreadyExists = results.filter(r => r.status === "already_exists").length;
    
    console.log("\nMigration Summary:");
    console.log(`- Total admin users: ${results.length}`);
    console.log(`- Newly migrated: ${migrated}`);
    console.log(`- Already in admins collection: ${alreadyExists}`);
    console.log("\nMigration completed successfully!");
    
  } catch (error) {
    console.error("Error during admin migration:", error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (process.argv[1].includes("migrate-admins")) {
  migrateAdmins()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateAdmins };
