import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dsm-autoparts-secret-key-2026';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    console.error('JWT verify failed:', e.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

export function staffOnly(req, res, next) {
  if (!['admin', 'salesperson'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff only' });
  }
  next();
}
