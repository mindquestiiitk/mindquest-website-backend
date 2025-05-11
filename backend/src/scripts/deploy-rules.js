/**
 * Script to deploy Firebase security rules and run admin migration
 * 
 * This script:
 * 1. Migrates existing admin users to the admins collection
 * 2. Deploys the updated security rules to Firebase
 */

import { exec } from "child_process";
import { promisify } from "util";
import { migrateAdmins } from "./migrate-admins.js";
import path from "path";
import { fileURLToPath } from "url";

const execPromise = promisify(exec);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

async function deployRules() {
  console.log("Starting deployment of Firebase security rules...");
  
  try {
    // First, migrate admin users
    console.log("Migrating admin users...");
    await migrateAdmins();
    
    // Deploy Firestore rules
    console.log("\nDeploying Firestore rules...");
    const firestoreResult = await execPromise("firebase deploy --only firestore:rules", {
      cwd: rootDir
    });
    console.log(firestoreResult.stdout);
    
    // Deploy Storage rules
    console.log("\nDeploying Storage rules...");
    const storageResult = await execPromise("firebase deploy --only storage", {
      cwd: rootDir
    });
    console.log(storageResult.stdout);
    
    console.log("\nDeployment completed successfully!");
  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

// Run the deployment if this script is executed directly
if (process.argv[1].includes("deploy-rules")) {
  deployRules()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

export { deployRules };
