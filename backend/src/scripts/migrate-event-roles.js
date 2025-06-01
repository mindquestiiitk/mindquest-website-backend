/**
 * Migration Script: Event Roles to Subcollections
 * 
 * This script migrates event roles from the old structure:
 * /event_roles/{userId_eventId}
 * 
 * To the new subcollection structure:
 * /events/{eventId}/event_roles/{userId}
 * 
 * Usage: node src/scripts/migrate-event-roles.js
 */

import { admin } from "../config/firebase.config.js";
import logger from "../utils/logger.js";
import { withRetry } from "../utils/firebase-utils.js";

const db = admin.db;

/**
 * Migrate event roles from old collection to new subcollection structure
 */
async function migrateEventRoles() {
  try {
    logger.info("Starting event roles migration...");

    // Get all existing event roles from the old collection
    const oldRolesSnapshot = await withRetry(() =>
      db.collection("event_roles").get()
    );

    if (oldRolesSnapshot.empty) {
      logger.info("No event roles found to migrate");
      return;
    }

    logger.info(`Found ${oldRolesSnapshot.size} event roles to migrate`);

    const batch = db.batch();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const roleDoc of oldRolesSnapshot.docs) {
      try {
        const roleData = roleDoc.data();
        const roleId = roleDoc.id;

        // Skip if no eventId (global roles - these need special handling)
        if (!roleData.eventId) {
          logger.warn(`Skipping role ${roleId} - no eventId (global role)`);
          skippedCount++;
          continue;
        }

        // Extract eventId and userId from the role data
        const { eventId, userId } = roleData;

        if (!userId) {
          logger.warn(`Skipping role ${roleId} - no userId`);
          skippedCount++;
          continue;
        }

        // Check if event exists
        const eventDoc = await withRetry(() =>
          db.collection("events").doc(eventId).get()
        );

        if (!eventDoc.exists) {
          logger.warn(`Skipping role ${roleId} - event ${eventId} not found`);
          skippedCount++;
          continue;
        }

        // Create the new subcollection document
        const newRoleRef = db
          .collection("events")
          .doc(eventId)
          .collection("event_roles")
          .doc(userId);

        // Add to batch
        batch.set(newRoleRef, roleData);
        migratedCount++;

        logger.debug(`Queued migration for role: ${roleId} -> events/${eventId}/event_roles/${userId}`);

        // Commit batch every 500 operations to avoid limits
        if (migratedCount % 500 === 0) {
          await withRetry(() => batch.commit());
          logger.info(`Migrated ${migratedCount} roles so far...`);
        }

      } catch (error) {
        logger.error(`Failed to process role ${roleDoc.id}:`, error);
        skippedCount++;
      }
    }

    // Commit remaining operations
    if (migratedCount % 500 !== 0) {
      await withRetry(() => batch.commit());
    }

    logger.info("Migration completed successfully", {
      totalFound: oldRolesSnapshot.size,
      migrated: migratedCount,
      skipped: skippedCount,
    });

    // Ask user if they want to delete old collection
    logger.info("Migration complete. You can now manually verify the new structure and delete the old 'event_roles' collection if everything looks correct.");

  } catch (error) {
    logger.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Verify migration by comparing counts
 */
async function verifyMigration() {
  try {
    logger.info("Verifying migration...");

    // Count old roles
    const oldRolesSnapshot = await withRetry(() =>
      db.collection("event_roles").where("eventId", "!=", null).get()
    );
    const oldCount = oldRolesSnapshot.size;

    // Count new roles across all events
    const eventsSnapshot = await withRetry(() =>
      db.collection("events").get()
    );

    let newCount = 0;
    for (const eventDoc of eventsSnapshot.docs) {
      const eventRolesSnapshot = await withRetry(() =>
        eventDoc.ref.collection("event_roles").get()
      );
      newCount += eventRolesSnapshot.size;
    }

    logger.info("Migration verification", {
      oldStructureCount: oldCount,
      newStructureCount: newCount,
      match: oldCount === newCount,
    });

    return oldCount === newCount;

  } catch (error) {
    logger.error("Verification failed:", error);
    return false;
  }
}

/**
 * Cleanup old event_roles collection (use with caution!)
 */
async function cleanupOldCollection() {
  try {
    logger.warn("⚠️  DANGER: This will delete the old event_roles collection!");
    logger.warn("Make sure you have verified the migration first!");

    // Get all documents in old collection
    const oldRolesSnapshot = await withRetry(() =>
      db.collection("event_roles").get()
    );

    if (oldRolesSnapshot.empty) {
      logger.info("Old collection is already empty");
      return;
    }

    const batch = db.batch();
    let deletedCount = 0;

    oldRolesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await withRetry(() => batch.commit());

    logger.info(`Deleted ${deletedCount} documents from old event_roles collection`);

  } catch (error) {
    logger.error("Cleanup failed:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "migrate";

  try {
    switch (command) {
      case "migrate":
        await migrateEventRoles();
        break;
      case "verify":
        const isValid = await verifyMigration();
        process.exit(isValid ? 0 : 1);
        break;
      case "cleanup":
        await cleanupOldCollection();
        break;
      default:
        logger.info("Usage:");
        logger.info("  node src/scripts/migrate-event-roles.js migrate   # Migrate roles to subcollections");
        logger.info("  node src/scripts/migrate-event-roles.js verify    # Verify migration");
        logger.info("  node src/scripts/migrate-event-roles.js cleanup   # Delete old collection (DANGER!)");
        process.exit(1);
    }
  } catch (error) {
    logger.error("Script failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateEventRoles, verifyMigration, cleanupOldCollection };
