/**
 * FINORA Authentication Routes
 * Handles login, logout, password change, registration
 */

import express from 'express';
import { authenticateUser, createUser, changePassword, getUserProfile, logAuditEvent } from '../auth.js';
import { requireAuth, sanitizeInput, createRateLimiter } from '../middleware.js';

const router = express.Router();

// Rate limit login attempts
const loginLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

// POST /api/auth/login
router.post('/login', sanitizeInput, loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await authenticateUser(email, password);
    
    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.role = user.role;
    
    // Log successful login
    await logAuditEvent(user.id, 'LOGIN', 'user', user.id, null, req.ip, req.get('user-agent'));
    
    // Get full profile
    const profile = await getUserProfile(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profile.profile || null
      },
      message: `Welcome back, ${profile.profile?.first_name || user.email}!`
    });
  } catch (error) {
    // Log failed login attempt
    await logAuditEvent(null, 'LOGIN_FAILED', 'user', null, { email: req.body.email }, req.ip);
    
    res.status(401).json({ 
      error: error.message || 'Authentication failed' 
    });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Log logout event
    await logAuditEvent(req.user.id, 'LOGOUT', 'user', req.user.id, null, req.ip);
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/register (for client registration)
router.post('/register', sanitizeInput, async (req, res) => {
  try {
    const { email, password, passwordConfirm, firstName, lastName, country } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    // Create user
    const user = await createUser(email, password, 'client');
    
    // Create client profile
    const clientQuery = `
      INSERT INTO client_profiles (user_id, first_name, last_name, email, country, client_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, first_name, last_name, email
    `;
    
    const clientCode = `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    const clientResult = await db.query(clientQuery, [
      user.id,
      firstName || 'Client',
      lastName || '',
      email,
      country || 'United States'
    ]);
    
    // Log account creation
    await logAuditEvent(user.id, 'REGISTER', 'user', user.id, null, req.ip);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, sanitizeInput, async (req, res) => {
  try {
    const { oldPassword, newPassword, newPasswordConfirm } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }
    
    const user = await changePassword(req.user.id, oldPassword, newPassword);
    
    // Log password change
    await logAuditEvent(req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, null, req.ip);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/me (get current user)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.id);
    
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        profile: profile.profile || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// POST /api/auth/session-check
router.post('/session-check', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true,
      userId: req.session.userId,
      role: req.session.role
    });
  } else {
    res.json({ 
      authenticated: false 
    });
  }
});

export default router;
