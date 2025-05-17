/**
 * Event Role Model Tests
 * Tests for the event role model
 */
import {
  EventRoleModel,
  RoleType,
  RoleLevel,
} from "../src/models/event-role.model.js";
import { db } from "../src/config/firebase.config.js";
import {
  createTestUser,
  createTestEvent,
  cleanupTestData,
} from "./test-utils.js";

// Test data
const TEST_USER = {
  email: "test-role-user@example.com",
  password: "Password123!",
  uid: "test-role-user-uid",
  name: "Test Role User",
};

const TEST_EVENT = {
  id: "test-role-event-id",
  title: "Test Role Event",
  date: "2025-06-15",
  description: "Test event for role testing",
};

// Global variables
let eventRoleModel;
let testUser;
let testEvent;
let createdRoles = [];

// Setup before all tests
beforeAll(async () => {
  eventRoleModel = new EventRoleModel();
  testUser = await createTestUser(TEST_USER);
  testEvent = await createTestEvent(TEST_EVENT);
}, 30000);

// Clean up after all tests
afterAll(async () => {
  await cleanupTestData({
    users: [testUser],
    events: [testEvent],
    roles: createdRoles,
  });
}, 10000);

describe("EventRoleModel", () => {
  // Test creating a role
  test("Should create a role with correct role level", async () => {
    const roleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.ORGANIZER,
      expiration: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    };

    const role = await eventRoleModel.createRole(roleData);
    createdRoles.push(role);

    expect(role).toHaveProperty("id");
    expect(role).toHaveProperty("userId", testUser.uid);
    expect(role).toHaveProperty("eventId", testEvent.id);
    expect(role).toHaveProperty("role", RoleType.ORGANIZER);
    expect(role).toHaveProperty("roleLevel", RoleLevel.ORGANIZER);
    expect(role).toHaveProperty("isActive", true);

    // Verify the role was created in Firestore
    const docRef = db.collection("event_roles").doc(role.id);
    const doc = await docRef.get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toHaveProperty("userId", testUser.uid);
  }, 10000);

  // Test getting user roles
  test("Should get roles for a user", async () => {
    const roles = await eventRoleModel.getUserRoles(testUser.uid);

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);

    const foundRole = roles.find((r) => r.eventId === testEvent.id);
    expect(foundRole).toBeDefined();
    expect(foundRole).toHaveProperty("role", RoleType.ORGANIZER);
  }, 10000);

  // Test getting event roles
  test("Should get roles for an event", async () => {
    const roles = await eventRoleModel.getEventRoles(testEvent.id);

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);

    const foundRole = roles.find((r) => r.userId === testUser.uid);
    expect(foundRole).toBeDefined();
    expect(foundRole).toHaveProperty("role", RoleType.ORGANIZER);
  }, 10000);

  // Test role expiration
  test("Should identify and deactivate expired roles", async () => {
    // Create a role with an expiration date in the past
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const expiredRoleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.VOLUNTEER,
      expiration: yesterday,
    };

    const expiredRole = await eventRoleModel.createRole(expiredRoleData);
    createdRoles.push(expiredRole);

    // Get expired roles
    const expiredRoles = await eventRoleModel.getExpiredRoles();

    expect(Array.isArray(expiredRoles)).toBe(true);
    expect(expiredRoles.length).toBeGreaterThan(0);

    const foundExpiredRole = expiredRoles.find((r) => r.id === expiredRole.id);
    expect(foundExpiredRole).toBeDefined();

    // Deactivate expired roles
    const count = await eventRoleModel.deactivateExpiredRoles();
    expect(count).toBeGreaterThan(0);

    // Verify the role was deactivated
    const docRef = db.collection("event_roles").doc(expiredRole.id);
    const doc = await docRef.get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toHaveProperty("isActive", false);
  }, 15000);

  // Test updating role expiration
  test("Should update role expiration", async () => {
    // Create a new role
    const roleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.MENTOR,
      expiration: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    };

    const role = await eventRoleModel.createRole(roleData);
    createdRoles.push(role);

    // Update expiration
    const newExpiration = new Date(Date.now() + 86400000 * 60); // 60 days from now
    const updatedRole = await eventRoleModel.updateRoleExpiration(
      role.id,
      newExpiration
    );

    expect(updatedRole).toHaveProperty("id", role.id);
    expect(updatedRole).toHaveProperty(
      "expiration",
      newExpiration.toISOString()
    );

    // Verify the update in Firestore
    const docRef = db.collection("event_roles").doc(role.id);
    const doc = await docRef.get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toHaveProperty(
      "expiration",
      newExpiration.toISOString()
    );
  }, 10000);
});
