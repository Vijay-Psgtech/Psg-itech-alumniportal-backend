// ✅ Kept for backwards compatibility (donations.js imports this directly)
//    Delegates to the unified auth middleware.
const { authMiddleware } = require("./auth");
module.exports = authMiddleware;