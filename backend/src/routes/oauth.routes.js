/**
 * OAuth Routes
 * 
 * Routes for handling OAuth provider authentication
 */

import express from "express";
import { oAuthController } from "../controllers/oauth.controller.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// Route for handling Google OAuth sign-in
router.post("/google", arcjetProtection, oAuthController.handleGoogleSignIn);

export default router;
