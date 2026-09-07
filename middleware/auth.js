const jwt = require("jsonwebtoken");

// ── Verify JWT token ─────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
    req.user._id = decoded.id;  // Map 'id' to '_id' for controller consistency
    req.userId = decoded.id;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
      });
    }

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ── Admin Only Middleware ─────────────────────────────────────────
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};


// ── Super Admin Only Middleware ───────────────────────────────────
const superAdminMiddleware = (req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({
      message: "Super admin access required",
    });
  }

  next();
};

// ── Alumni Only Middleware ────────────────────────────────────────
const alumniMiddleware = (req, res, next) => {
  if (req.user?.role !== "alumni") {
    return res.status(403).json({
      message: "Alumni access required",
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  superAdminMiddleware,
  alumniMiddleware,
};