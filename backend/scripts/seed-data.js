#!/usr/bin/env node

/**
 * Data Seeding Script
 * 
 * This script seeds various collections in Firebase with initial data.
 * It uses the Firebase Admin SDK with proper authentication.
 * 
 * IMPORTANT: This script should only be run by administrators during setup
 * or when resetting the database. It requires admin privileges.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import readline from 'readline';
import { config } from '@dotenvx/dotenvx';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
config({ path: path.join(rootDir, '.env') });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(chalk.blue('='.repeat(80)));
console.log(chalk.blue.bold('Firebase Data Seeding Script'));
console.log(chalk.blue('='.repeat(80)));
console.log();

console.log(chalk.yellow('This script will seed your Firebase database with initial data.'));
console.log(chalk.red.bold('⚠️ WARNING: This script requires admin privileges and will overwrite existing data.'));
console.log();

// Ask for confirmation
rl.question(chalk.yellow('Do you want to continue? (y/N): '), async (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log(chalk.green('Operation cancelled.'));
    rl.close();
    return;
  }

  try {
    // Initialize Firebase Admin SDK
    let app;
    let db;
    
    try {
      // Try to find service account file
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                                path.join(rootDir, 'service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log(chalk.green(`Using service account file: ${serviceAccountPath}`));
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        app = initializeApp({
          credential: cert(serviceAccount)
        });
      } else {
        console.log(chalk.yellow('No service account file found. Please provide Firebase project ID:'));
        const projectId = await askQuestion('Firebase Project ID: ');
        
        app = initializeApp({
          projectId: projectId
        });
      }
      
      db = getFirestore(app);
      console.log(chalk.green('✓ Connected to Firebase'));
    } catch (error) {
      console.error(chalk.red(`Error initializing Firebase: ${error.message}`));
      rl.close();
      return;
    }

    // Ask which collections to seed
    console.log();
    console.log(chalk.cyan('Which collections would you like to seed?'));
    const seedProducts = await askYesNo('Products? (y/N): ');
    const seedTeams = await askYesNo('Teams? (y/N): ');
    const seedEvents = await askYesNo('Events? (y/N): ');
    
    // Seed products if selected
    if (seedProducts) {
      try {
        console.log(chalk.cyan('Seeding products...'));
        const productsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'products.json'), 'utf8'));
        
        // Create a batch for better performance
        const batch = db.batch();
        
        for (const product of productsData.products) {
          const productRef = db.collection('products').doc(product.id.toString());
          batch.set(productRef, {
            ...product,
            updatedAt: new Date()
          });
        }
        
        await batch.commit();
        console.log(chalk.green(`✓ Seeded ${productsData.products.length} products`));
      } catch (error) {
        console.error(chalk.red(`Error seeding products: ${error.message}`));
      }
    }
    
    // Seed teams if selected
    if (seedTeams) {
      try {
        console.log(chalk.cyan('Seeding teams...'));
        const teamsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'teams.json'), 'utf8'));
        
        // Create a batch for better performance
        const batch = db.batch();
        
        for (const team of teamsData.teams) {
          const teamRef = db.collection('teams').doc(team.id.toString());
          batch.set(teamRef, {
            ...team,
            updatedAt: new Date()
          });
        }
        
        await batch.commit();
        console.log(chalk.green(`✓ Seeded ${teamsData.teams.length} teams`));
      } catch (error) {
        console.error(chalk.red(`Error seeding teams: ${error.message}`));
      }
    }
    
    // Seed events if selected
    if (seedEvents) {
      try {
        console.log(chalk.cyan('Seeding events...'));
        const eventsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'events.json'), 'utf8'));
        
        // Create a batch for better performance
        const batch = db.batch();
        
        for (const event of eventsData.events) {
          const eventRef = db.collection('events').doc(event.id.toString());
          batch.set(eventRef, {
            ...event,
            updatedAt: new Date()
          });
        }
        
        await batch.commit();
        console.log(chalk.green(`✓ Seeded ${eventsData.events.length} events`));
      } catch (error) {
        console.error(chalk.red(`Error seeding events: ${error.message}`));
      }
    }
    
    console.log();
    console.log(chalk.green.bold('Seeding completed!'));
    rl.close();
  } catch (error) {
    console.error(chalk.red(`An error occurred: ${error.message}`));
    rl.close();
  }
});

// Helper function to ask a yes/no question
function askYesNo(question) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow(question), (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Helper function to ask a question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow(question), (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to get directory name
function dirname(path) {
  return path.replace(/\/[^\/]+\/?$/, '');
}
