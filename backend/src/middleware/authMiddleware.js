const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Token faltante.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = authMiddleware;
