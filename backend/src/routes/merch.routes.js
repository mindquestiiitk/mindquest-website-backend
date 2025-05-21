import express from "express";
import { admin } from "../config/firebase.config.js";
import { formatResponse, formatNotFound } from "../utils/response.format.js";
import logger from "../utils/logger.js";
import { executeWithRetry, createErrorResponse } from "../utils/error.js";
import { executeQueryWithCache } from "../utils/firebase-performance.js";
import { clientAuthMiddleware } from "../middleware/client-auth.middleware.js";

const router = express.Router();

router.get("/products", async (req, res) => {
  try {
    // Get query parameters for filtering
    const category = req.query.category;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    // Create query parameters object for cache key generation
    const queryParams = {
      category,
      maxPrice,
      // Add any other query parameters here
    };

    // Use executeQueryWithCache for caching and executeWithRetry for error handling
    const products = await executeQueryWithCache(
      "products",
      async () => {
        return await executeWithRetry(
          async () => {
            // Use admin SDK to access Firestore
            let productsRef = admin.db.collection("products");

            // Apply filters if provided
            if (category) {
              productsRef = productsRef.where("category", "==", category);
            }

            if (maxPrice) {
              productsRef = productsRef.where("price", "<=", maxPrice);
            }

            const productsSnapshot = await productsRef.get();
            return productsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
          },
          { maxRetries: 3, baseDelay: 1000 },
          { path: req.path, operation: "getProducts" }
        );
      },
      queryParams,
      {
        // Cache for 5 minutes
        ttl: 5 * 60 * 1000,
        // Force refresh if requested
        bypassCache: req.query.refresh === "true",
      }
    );

    // Use standardized response format
    formatResponse(req, res, products, "Products retrieved successfully");
  } catch (error) {
    logger.error("Error fetching products", {
      error: error.message,
      code: error.code,
      path: req.path,
      query: req.query,
    });

    // Use our enhanced error handling
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.error.status || 500).json(errorResponse);
  }
});

router.get("/sales", async (req, res) => {
  try {
    // Use executeQueryWithCache for caching with a longer TTL since sales change less frequently
    const sale = await executeQueryWithCache(
      "sales",
      async () => {
        return await executeWithRetry(
          async () => {
            // Use admin SDK to access Firestore
            const salesRef = admin.db.collection("sales").limit(1);
            const saleSnapshot = await salesRef.get();
            return saleSnapshot.docs[0]?.data();
          },
          { maxRetries: 3, baseDelay: 1000 },
          { path: req.path, operation: "getSales" }
        );
      },
      {},
      {
        // Cache for 15 minutes since sales don't change often
        ttl: 15 * 60 * 1000,
        // Force refresh if requested
        bypassCache: req.query.refresh === "true",
      }
    );

    if (!sale) {
      logger.warn("No sale found", { path: req.path });
      return formatNotFound(res, "No sale found");
    }

    // Use standardized response format
    formatResponse(req, res, sale, "Sale retrieved successfully");
  } catch (error) {
    logger.error("Error fetching sale", {
      error: error.message,
      code: error.code,
      path: req.path,
      query: req.query,
    });

    // Use our enhanced error handling
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.error.status || 500).json(errorResponse);
  }
});

// Order endpoint using Firebase Firestore
// This endpoint requires authentication
router.post("/order", clientAuthMiddleware, async (req, res) => {
  try {
    const { name, email, phone, cart } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !cart) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Missing required fields",
          code: "missing_fields",
          category: "validation",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid email format",
          code: "invalid_email",
          category: "validation",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Phone number must be 10 digits",
          code: "invalid_phone",
          category: "validation",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Create order in Firestore
    const timestamp = Date.now();
    const orderId = `order-${timestamp}-${req.user.id.substring(0, 6)}`;

    const orderData = {
      orderId,
      userId: req.user.id,
      name,
      email,
      phone,
      cart,
      status: "pending",
      createdAt: admin.db.FieldValue.serverTimestamp(),
      updatedAt: admin.db.FieldValue.serverTimestamp(),
    };

    // Save order to Firestore
    await admin.db.collection("orders").doc(orderId).set(orderData);

    // Log the successful order
    logger.info("Merch order submitted successfully", {
      userId: req.user.id,
      email,
      items: cart.length,
      orderId,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        orderId,
        message: "Order submitted successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error submitting merch order", {
      error: error.message,
      userId: req.user?.id,
      path: req.path,
    });

    // Return error response
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to submit order",
        code: "order_submission_failed",
        category: "database",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
