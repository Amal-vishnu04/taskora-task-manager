const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  if (!payload || typeof payload !== 'object' || !payload.userId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  req.userId = payload.userId;
  return next();
}

module.exports = authMiddleware;