const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, message = "Too many requests. Please try again later." } = {}) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > max) return res.status(429).json({ message });
  return next();
};

module.exports = rateLimit;
