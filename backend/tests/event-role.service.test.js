/**
 * Event Role Service Tests
 * Tests for the event role service
 */
import { EventRoleService } from "../src/services/event-role.service.js";
import { RoleType } from "../src/models/event-role.model.js";
import { db } from "../src/config/firebase.config.js";
import {
  createTestUser,
  createTestEvent,
  cleanupTestData,
} from "./test-utils.js";
import { AppError } from "../src/utils/error.js";

// Test data
const TEST_USER = {
  email: "test-role-service-user@example.com",
  password: "Password123!",
  uid: "test-role-service-user-uid",
  name: "Test Role Service User",
};

const TEST_EVENT = {
  id: "test-role-service-event-id",
  title: "Test Role Service Event",
  date: "2025-06-15",
  description: "Test event for role service testing",
};

// Global variables
let eventRoleService;
let testUser;
let testEvent;
let createdRoles = [];

// Setup before all tests
beforeAll(async () => {
  eventRoleService = new EventRoleService();
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

describe("EventRoleService", () => {
  // Test assigning a role
  test("Should assign a role to a user for an event", async () => {
    const roleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.LEAD,
      expiration: new Date(Date.now() + 86400000 * 30), // 30 days from now
    };

    const role = await eventRoleService.assignRole(roleData);
    createdRoles.push(role);

    expect(role).toHaveProperty("id");
    expect(role).toHaveProperty("userId", testUser.uid);
    expect(role).toHaveProperty("eventId", testEvent.id);
    expect(role).toHaveProperty("role", RoleType.LEAD);
    expect(role).toHaveProperty("permissions");
    expect(Array.isArray(role.permissions)).toBe(true);
    expect(role.permissions.length).toBeGreaterThan(0);
  }, 10000);

  // Test getting user roles with enriched data
  test("Should get enriched roles for a user", async () => {
    const roles = await eventRoleService.getUserRoles(testUser.uid);

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);

    const foundRole = roles.find((r) => r.eventId === testEvent.id);
    expect(foundRole).toBeDefined();
    expect(foundRole).toHaveProperty("user");
    expect(foundRole.user).toHaveProperty("name", testUser.name);
    expect(foundRole).toHaveProperty("event");
    expect(foundRole.event).toHaveProperty("title", testEvent.title);
  }, 10000);

  // Test getting event roles with enriched data
  test("Should get enriched roles for an event", async () => {
    const roles = await eventRoleService.getEventRoles(testEvent.id);

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);

    const foundRole = roles.find((r) => r.userId === testUser.uid);
    expect(foundRole).toBeDefined();
    expect(foundRole).toHaveProperty("user");
    expect(foundRole.user).toHaveProperty("name", testUser.name);
    expect(foundRole).toHaveProperty("event");
    expect(foundRole.event).toHaveProperty("title", testEvent.title);
  }, 10000);

  // Test role expiration processing
  test("Should process expired roles", async () => {
    // Create a role with an expiration date in the past
    const yesterday = new Date(Date.now() - 86400000);

    const expiredRoleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.VOLUNTEER,
      expiration: yesterday,
    };

    const expiredRole = await eventRoleService.assignRole(expiredRoleData);
    createdRoles.push(expiredRole);

    // Process expired roles
    const count = await eventRoleService.processExpiredRoles();
    expect(count).toBeGreaterThan(0);

    // Get legacy roles
    const legacyRoles = await eventRoleService.getLegacyRoles();

    expect(Array.isArray(legacyRoles)).toBe(true);
    expect(legacyRoles.length).toBeGreaterThan(0);

    const foundLegacyRole = legacyRoles.find((r) => r.id === expiredRole.id);
    expect(foundLegacyRole).toBeDefined();
    expect(foundLegacyRole).toHaveProperty("isActive", false);
    expect(foundLegacyRole).toHaveProperty("user");
    expect(foundLegacyRole.user).toHaveProperty("name", testUser.name);
  }, 15000);

  // Test updating a role
  test("Should update an existing role", async () => {
    // Create a new role
    const roleData = {
      userId: testUser.uid,
      eventId: testEvent.id,
      role: RoleType.SUBLEAD,
      expiration: new Date(Date.now() + 86400000 * 30), // 30 days from now
    };

    const role = await eventRoleService.assignRole(roleData);
    createdRoles.push(role);

    // Update the role
    const newExpiration = new Date(Date.now() + 86400000 * 60); // 60 days from now
    const updatedRole = await eventRoleService.updateRole(role.id, {
      role: RoleType.MENTOR,
      expiration: newExpiration,
    });

    expect(updatedRole).toHaveProperty("id", role.id);
    expect(updatedRole).toHaveProperty("role", RoleType.MENTOR);
    expect(updatedRole).toHaveProperty(
      "expiration",
      newExpiration.toISOString()
    );

    // Verify the role was updated in Firestore
    const docRef = db.collection("event_roles").doc(role.id);
    const doc = await docRef.get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toHaveProperty("role", RoleType.MENTOR);
  }, 10000);

  // Test validation
  test("Should validate user and event existence", async () => {
    // Try to assign a role to a non-existent user
    const invalidUserRoleData = {
      userId: "non-existent-user",
      eventId: testEvent.id,
      role: RoleType.VOLUNTEER,
      expiration: new Date(Date.now() + 86400000 * 30), // 30 days from now
    };

    await expect(
      eventRoleService.assignRole(invalidUserRoleData)
    ).rejects.toThrow(AppError);

    // Try to assign a role for a non-existent event
    const invalidEventRoleData = {
      userId: testUser.uid,
      eventId: "non-existent-event",
      role: RoleType.VOLUNTEER,
      expiration: new Date(Date.now() + 86400000 * 30), // 30 days from now
    };

    await expect(
      eventRoleService.assignRole(invalidEventRoleData)
    ).rejects.toThrow(AppError);
  }, 10000);
});
