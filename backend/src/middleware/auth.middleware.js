import { auth } from "../config/firebase.config.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userDoc = await auth.getUser(req.user.uid);
      const userRole = userDoc.customClaims?.role || "user";

      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: "Not authorized" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
