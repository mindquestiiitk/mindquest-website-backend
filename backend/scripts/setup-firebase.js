#!/usr/bin/env node

/**
 * Firebase Setup Script
 *
 * This script helps set up Firebase credentials for local development.
 * It guides the user through the process of creating a service account
 * and saving the credentials to a file.
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import chalk from "chalk";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Define paths
const rootDir = path.resolve(process.cwd());
const serviceAccountPath = path.join(rootDir, "service-account.json");
const envPath = path.join(rootDir, ".env");

console.log(chalk.blue("=".repeat(80)));
console.log(chalk.blue.bold("Firebase Admin Setup Script"));
console.log(chalk.blue("=".repeat(80)));
console.log();

console.log(
  chalk.yellow(
    "This script will help you set up Firebase Admin SDK credentials for local development."
  )
);
console.log();
console.log(
  chalk.red.bold(
    "⚠️ WARNING: This script sets up admin-privileged credentials with full access to your Firebase project."
  )
);
console.log(
  chalk.red(
    "For most development tasks, you should use the client SDK setup instead:"
  )
);
console.log(chalk.cyan("  npm run setup:firebase:client"));
console.log();
console.log(
  chalk.yellow(
    "Only continue if you specifically need admin privileges for certain operations."
  )
);
console.log();

// Ask for confirmation before proceeding
rl.question(
  chalk.yellow("Do you want to continue with admin setup? (y/N): "),
  (answer) => {
    if (answer.toLowerCase() !== "y") {
      console.log(
        chalk.green(
          "Setup cancelled. Consider using the client SDK setup instead:"
        )
      );
      console.log(chalk.cyan("  npm run setup:firebase:client"));
      rl.close();
      return;
    }

    // Check if service account file already exists
    if (fs.existsSync(serviceAccountPath)) {
      console.log(chalk.green("✓ Service account file already exists at:"));
      console.log(chalk.green(`  ${serviceAccountPath}`));
      console.log();

      askToOverwrite();
    } else {
      showInstructions();
    }
  }
);

function askToOverwrite() {
  rl.question(
    chalk.yellow(
      "Do you want to overwrite the existing service account file? (y/N): "
    ),
    (answer) => {
      if (answer.toLowerCase() === "y") {
        showInstructions();
      } else {
        console.log(chalk.green("Using existing service account file."));
        checkEnvFile();
      }
    }
  );
}

function showInstructions() {
  console.log(
    chalk.cyan("To set up Firebase credentials, follow these steps:")
  );
  console.log();
  console.log(
    chalk.white(
      "1. Go to the Firebase Console: https://console.firebase.google.com/"
    )
  );
  console.log(chalk.white("2. Select your project"));
  console.log(chalk.white("3. Go to Project Settings (gear icon)"));
  console.log(chalk.white('4. Go to the "Service accounts" tab'));
  console.log(chalk.white('5. Click "Generate new private key"'));
  console.log(chalk.white("6. Save the JSON file"));
  console.log();

  askForServiceAccountPath();
}

function askForServiceAccountPath() {
  rl.question(
    chalk.yellow(
      "Enter the path to your downloaded service account JSON file: "
    ),
    (filePath) => {
      const resolvedPath = path.resolve(filePath.trim());

      if (!fs.existsSync(resolvedPath)) {
        console.log(chalk.red(`Error: File not found at ${resolvedPath}`));
        askForServiceAccountPath();
        return;
      }

      try {
        const fileContent = fs.readFileSync(resolvedPath, "utf8");
        const serviceAccount = JSON.parse(fileContent);

        // Validate that it's a Firebase service account
        if (
          !serviceAccount.type ||
          serviceAccount.type !== "service_account" ||
          !serviceAccount.project_id ||
          !serviceAccount.private_key
        ) {
          console.log(
            chalk.red(
              "Error: The file does not appear to be a valid Firebase service account key."
            )
          );
          askForServiceAccountPath();
          return;
        }

        // Save the service account file
        fs.writeFileSync(serviceAccountPath, fileContent);
        console.log(
          chalk.green(`✓ Service account file saved to ${serviceAccountPath}`)
        );

        // Extract project information
        const projectId = serviceAccount.project_id;
        console.log(chalk.green(`✓ Project ID: ${projectId}`));

        checkEnvFile(projectId);
      } catch (error) {
        console.log(chalk.red(`Error processing file: ${error.message}`));
        askForServiceAccountPath();
      }
    }
  );
}

function checkEnvFile(projectId) {
  console.log();
  console.log(chalk.cyan("Checking environment variables..."));

  let envContent = "";
  let envExists = false;

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
    envExists = true;
    console.log(chalk.green("✓ .env file exists"));
  } else {
    console.log(chalk.yellow("! .env file does not exist, will create one"));
  }

  // Check if FIREBASE_PROJECT_ID is set
  const hasProjectId = envContent.includes("FIREBASE_PROJECT_ID=");

  if (projectId && !hasProjectId) {
    // Add FIREBASE_PROJECT_ID to .env
    envContent += `\n# Firebase Configuration\nFIREBASE_PROJECT_ID=${projectId}\n`;
    console.log(
      chalk.green(`✓ Added FIREBASE_PROJECT_ID=${projectId} to .env`)
    );
  }

  // Add GOOGLE_APPLICATION_CREDENTIALS if not present
  if (!envContent.includes("GOOGLE_APPLICATION_CREDENTIALS=")) {
    const relativePath = path
      .relative(rootDir, serviceAccountPath)
      .replace(/\\/g, "/");
    envContent += `\n# Path to Firebase service account\nGOOGLE_APPLICATION_CREDENTIALS=${relativePath}\n`;
    console.log(
      chalk.green(
        `✓ Added GOOGLE_APPLICATION_CREDENTIALS=${relativePath} to .env`
      )
    );
  }

  // Save the updated .env file
  fs.writeFileSync(envPath, envContent);
  console.log(chalk.green(`✓ .env file ${envExists ? "updated" : "created"}`));

  console.log();
  console.log(chalk.green.bold("Firebase setup complete!"));
  console.log();
  console.log(
    chalk.yellow(
      "IMPORTANT: Never commit your service account file to version control."
    )
  );
  console.log(chalk.yellow("           Make sure it is listed in .gitignore."));
  console.log();

  // Check .gitignore
  checkGitignore();
}

function checkGitignore() {
  const gitignorePath = path.join(rootDir, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    const serviceAccountFileName = path.basename(serviceAccountPath);

    // Check if service account file is ignored
    const isIgnored =
      gitignoreContent.includes(serviceAccountFileName) ||
      gitignoreContent.includes("service-account.json") ||
      gitignoreContent.includes("*-service-account.json") ||
      gitignoreContent.includes("*.json");

    if (!isIgnored) {
      // Add service account file to .gitignore
      gitignoreContent += `\n# Firebase service account\n${serviceAccountFileName}\n`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log(
        chalk.green(`✓ Added ${serviceAccountFileName} to .gitignore`)
      );
    } else {
      console.log(
        chalk.green("✓ Service account file is already ignored in .gitignore")
      );
    }
  } else {
    // Create .gitignore file
    const serviceAccountFileName = path.basename(serviceAccountPath);
    const gitignoreContent = `# Firebase service account\n${serviceAccountFileName}\n`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(
      chalk.green(`✓ Created .gitignore file with ${serviceAccountFileName}`)
    );
  }

  rl.close();
}

rl.on("close", () => {
  console.log(chalk.blue("=".repeat(80)));
  process.exit(0);
});
