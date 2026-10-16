/**
 * FINORA Authentication Middleware
 * Protects routes and checks user permissions
 */

import { getUserById, logAuditEvent } from './auth.js';

// Middleware: Check if user is authenticated
export const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Unauthorized. Please log in.' 
    });
  }
  
  try {
    const user = await getUserById(req.session.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ 
        error: 'User account is not active' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ 
      error: 'Authentication error' 
    });
  }
};

// Middleware: Check if user has required role(s)
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role(s): ${roles.join(', ')}` 
      });
    }
    
    next();
  };
};

// Middleware: Log user actions for audit trail
export const auditLog = (resourceType, getResourceId = null) => {
  return async (req, res, next) => {
    // Capture original res.json to log after response
    const originalJson = res.json;
    
    res.json = async function(data) {
      if (res.statusCode < 400 && req.user) {
        try {
          const resourceId = getResourceId ? getResourceId(req, data) : null;
          const action = `${req.method} ${req.path}`.split('/').pop();
          
          await logAuditEvent(
            req.user.id,
            action,
            resourceType,
            resourceId,
            req.body,
            req.ip,
            req.get('user-agent')
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Middleware: Rate limiting helper
export const createRateLimiter = (maxRequests, windowMs) => {
  const store = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}_${req.path}`;
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, []);
    }
    
    const requests = store.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.' 
      });
    }
    
    validRequests.push(now);
    store.set(key, validRequests);
    
    next();
  };
};

// Middleware: Sanitize input
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/[<>]/g, '')
          .trim();
      }
    }
  };
  
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  
  next();
};

// Middleware: Error handler with safe error messages
export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  
  // Don't expose sensitive error details
  let statusCode = 500;
  let message = 'An error occurred. Please try again later.';
  
  if (err.message && err.message.includes('Unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.message && err.message.includes('not found')) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.message && err.message.includes('already exists')) {
    statusCode = 409;
    message = err.message;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  res.status(statusCode).json({ error: message });
};

export default {
  requireAuth,
  requireRole,
  auditLog,
  createRateLimiter,
  sanitizeInput,
  errorHandler
};
