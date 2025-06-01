/**
 * Route Factory Utility
 * Provides common patterns for creating routes with consistent middleware application
 */

import { Router } from "express";
import { clientAuthMiddleware, clientAuthorize } from "../middleware/client-auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateRequest } from "./validator.js";
import { catchAsync } from "./error.js";

/**
 * Create a router with common middleware patterns
 * @param {Object} options - Router configuration options
 * @param {boolean} [options.requireAuth=false] - Whether all routes require authentication
 * @param {boolean} [options.useArcjet=false] - Whether to apply Arcjet protection
 * @param {Array} [options.allowedRoles] - Roles allowed to access all routes
 * @returns {Router} Configured Express router
 */
export function createRouter(options = {}) {
  const router = Router();
  const { requireAuth = false, useArcjet = false, allowedRoles = [] } = options;

  // Apply global middleware for this router
  if (useArcjet) {
    router.use(arcjetProtection);
  }

  if (requireAuth) {
    router.use(clientAuthMiddleware);
    
    if (allowedRoles.length > 0) {
      router.use(clientAuthorize(allowedRoles));
    }
  }

  return router;
}

/**
 * Create a route with common patterns
 * @param {Router} router - Express router instance
 * @param {string} method - HTTP method (get, post, put, delete, etc.)
 * @param {string} path - Route path
 * @param {Object} options - Route configuration options
 * @param {Function} handler - Route handler function
 * @returns {Router} Router instance for chaining
 */
export function createRoute(router, method, path, options, handler) {
  const {
    requireAuth = false,
    allowedRoles = [],
    useArcjet = false,
    validation = null,
    middleware = [],
  } = options;

  const routeMiddleware = [];

  // Add Arcjet protection if specified
  if (useArcjet) {
    routeMiddleware.push(arcjetProtection);
  }

  // Add authentication if required
  if (requireAuth) {
    routeMiddleware.push(clientAuthMiddleware);
    
    if (allowedRoles.length > 0) {
      routeMiddleware.push(clientAuthorize(allowedRoles));
    }
  }

  // Add validation if specified
  if (validation) {
    routeMiddleware.push(validateRequest(validation));
  }

  // Add custom middleware
  routeMiddleware.push(...middleware);

  // Wrap handler with error catching
  const wrappedHandler = catchAsync(handler);

  // Register the route
  router[method](path, ...routeMiddleware, wrappedHandler);

  return router;
}

/**
 * Create CRUD routes for a resource
 * @param {Object} controller - Controller instance with CRUD methods
 * @param {Object} options - CRUD route configuration
 * @returns {Router} Router with CRUD routes
 */
export function createCrudRoutes(controller, options = {}) {
  const {
    basePath = "",
    requireAuth = true,
    allowedRoles = [],
    validation = {},
    middleware = {},
  } = options;

  const router = createRouter({ requireAuth, allowedRoles });

  // GET /resource - List all
  if (controller.getAll) {
    createRoute(router, "get", basePath || "/", {
      middleware: middleware.getAll || [],
    }, controller.getAll.bind(controller));
  }

  // GET /resource/:id - Get by ID
  if (controller.getById) {
    createRoute(router, "get", `${basePath}/:id`, {
      middleware: middleware.getById || [],
    }, controller.getById.bind(controller));
  }

  // POST /resource - Create
  if (controller.create) {
    createRoute(router, "post", basePath || "/", {
      validation: validation.create,
      middleware: middleware.create || [],
    }, controller.create.bind(controller));
  }

  // PUT /resource/:id - Update
  if (controller.update) {
    createRoute(router, "put", `${basePath}/:id`, {
      validation: validation.update,
      middleware: middleware.update || [],
    }, controller.update.bind(controller));
  }

  // DELETE /resource/:id - Delete
  if (controller.delete) {
    createRoute(router, "delete", `${basePath}/:id`, {
      middleware: middleware.delete || [],
    }, controller.delete.bind(controller));
  }

  return router;
}

/**
 * Create protected routes with authentication and authorization
 * @param {Array} allowedRoles - Roles allowed to access these routes
 * @returns {Router} Router with authentication middleware
 */
export function createProtectedRouter(allowedRoles = []) {
  return createRouter({ 
    requireAuth: true, 
    allowedRoles 
  });
}

/**
 * Create public routes with optional Arcjet protection
 * @param {boolean} useArcjet - Whether to apply Arcjet protection
 * @returns {Router} Router for public routes
 */
export function createPublicRouter(useArcjet = false) {
  return createRouter({ 
    requireAuth: false, 
    useArcjet 
  });
}

/**
 * Create admin-only routes
 * @param {Array} adminRoles - Admin roles (default: ['admin', 'superadmin'])
 * @returns {Router} Router for admin routes
 */
export function createAdminRouter(adminRoles = ['admin', 'superadmin']) {
  return createRouter({ 
    requireAuth: true, 
    allowedRoles: adminRoles 
  });
}

/**
 * Add common route patterns to a router
 * @param {Router} router - Express router
 * @param {Object} patterns - Route patterns to add
 * @returns {Router} Router with added patterns
 */
export function addRoutePatterns(router, patterns) {
  Object.entries(patterns).forEach(([pattern, config]) => {
    const { method, path, handler, ...options } = config;
    createRoute(router, method, path, options, handler);
  });

  return router;
}
