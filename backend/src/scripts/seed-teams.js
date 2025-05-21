import { db } from "../config/firebase.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the people.json file
const peopleJsonPath = path.join(__dirname, "../../../frontend/public/people.json");

async function seedTeams() {
  try {
    console.log("Starting teams seeding process...");
    
    // Read the people.json file
    const peopleData = JSON.parse(fs.readFileSync(peopleJsonPath, "utf8"));
    console.log("Read people.json file successfully");
    
    // Transform the data to the format expected by our application
    const transformedData = [];
    
    // Process patrons
    if (peopleData.people.patrons) {
      peopleData.people.patrons.forEach((patron, index) => {
        transformedData.push({
          id: `patron-${index + 1}`,
          ...patron
        });
      });
    }
    
    // Process mentors
    if (peopleData.people.mentors) {
      peopleData.people.mentors.forEach((mentor, index) => {
        transformedData.push({
          id: `mentor-${index + 1}`,
          ...mentor
        });
      });
    }
    
    // Process batch2022
    if (peopleData.people.batch2022) {
      peopleData.people.batch2022.forEach((member, index) => {
        transformedData.push({
          id: `lead-${index + 1}`,
          batch: "2022",
          ...member
        });
      });
    }
    
    // Process batch2023
    if (peopleData.people.batch2023) {
      peopleData.people.batch2023.forEach((member, index) => {
        transformedData.push({
          id: `sublead-${index + 1}`,
          batch: "2023",
          ...member
        });
      });
    }
    
    // Process batch2024
    if (peopleData.people.batch2024) {
      peopleData.people.batch2024.forEach((member, index) => {
        transformedData.push({
          id: `member-${index + 1}`,
          batch: "2024",
          ...member
        });
      });
    }
    
    // Process developers (add type field if missing)
    if (peopleData.people.developers) {
      peopleData.people.developers.forEach((developer, index) => {
        transformedData.push({
          id: `dev-${index + 1}`,
          type: "developer", // Add type if missing
          ...developer
        });
      });
    }
    
    console.log(`Transformed ${transformedData.length} team members`);
    
    // Create a batch operation
    const batch = db.batch();
    
    // Clear existing team members
    console.log("Clearing existing team members...");
    const existingMembers = await db.collection("teams").get();
    console.log(`Found ${existingMembers.size} existing team members to clear`);
    existingMembers.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Add new team members
    console.log(`Adding ${transformedData.length} new team members...`);
    transformedData.forEach((member) => {
      console.log(`Adding team member: ${member.name} (ID: ${member.id})`);
      const memberRef = db.collection("teams").doc(member.id);
      batch.set(memberRef, member);
    });
    
    // Commit the batch
    await batch.commit();
    console.log("Teams seeded successfully!");
    
    // Verify seeding
    const verifyMembers = await db.collection("teams").get();
    console.log(`Verification: Found ${verifyMembers.size} team members after seeding`);
    
    return true;
  } catch (error) {
    console.error("Error seeding teams:", error);
    throw error;
  }
}

// Run the seed function
seedTeams()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
