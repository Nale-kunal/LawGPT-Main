import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
    
    if (!token) {
      // Clear any existing cookies if no token provided
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    
    // Validate payload structure
    if (!payload.userId || !payload.email) {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    req.user = payload;
    next();
  } catch (e) {
    console.error('Auth middleware error:', e.message);
    // Clear invalid cookies
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}



