/**
 * FINORA Authentication Utilities
 * Handles password hashing, verification, and user authentication
 */

import bcrypt from 'bcryptjs';
import db from './db.js';

// Hash password with bcrypt
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Verify password against hash
export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Create a new user account
export const createUser = async (email, password, role = 'client') => {
  try {
    const hashedPassword = await hashPassword(password);
    
    const query = `
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES ($1, $2, $3, TRUE)
      RETURNING id, email, role, created_at
    `;
    
    const result = await db.query(query, [email.toLowerCase(), hashedPassword, role]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

// Find user by email
export const getUserByEmail = async (email) => {
  const query = `
    SELECT id, email, password_hash, role, is_active
    FROM users
    WHERE LOWER(email) = LOWER($1)
  `;
  
  const result = await db.query(query, [email]);
  return result.rows[0] || null;
};

// Find user by ID
export const getUserById = async (userId) => {
  const query = `
    SELECT id, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = $1
  `;
  
  const result = await db.query(query, [userId]);
  return result.rows[0] || null;
};

// Authenticate user (login)
export const authenticateUser = async (email, password) => {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  if (!user.is_active) {
    throw new Error('This account has been deactivated');
  }
  
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }
  
  // Remove password hash before returning
  delete user.password_hash;
  return user;
};

// Get user profile with role-specific data
export const getUserProfile = async (userId) => {
  const user = await getUserById(userId);
  
  if (!user) {
    return null;
  }
  
  // Fetch role-specific profile data
  if (user.role === 'client') {
    const clientQuery = `
      SELECT cp.*, 
        (SELECT COUNT(*) FROM financial_goals WHERE client_id = cp.id AND status = 'In Progress')::INT as active_goals,
        (SELECT overall_score FROM financial_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1)::INT as health_score,
        (SELECT risk_profile FROM risk_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) as risk_profile
      FROM client_profiles cp
      WHERE cp.user_id = $1
    `;
    const clientResult = await db.query(clientQuery, [userId]);
    user.profile = clientResult.rows[0] || null;
  } else if (user.role === 'advisor') {
    const advisorQuery = `
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM advisor_clients WHERE advisor_id = a.id)::INT as client_count,
        (SELECT COUNT(*) FROM advisor_tasks WHERE advisor_id = $1 AND status = 'Open')::INT as open_tasks,
        (SELECT COUNT(*) FROM advisor_consultation_requests WHERE assigned_advisor_id = a.id AND status = 'Pending')::INT as pending_requests
      FROM advisors a
      WHERE a.id = (
        SELECT user_id FROM advisor_clients LIMIT 1
      )
    `;
    const advisorResult = await db.query(advisorQuery, [userId]);
    user.profile = advisorResult.rows[0] || null;
  }
  
  return user;
};

// Change password
export const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify old password
  const userWithHash = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  
  const isValidPassword = await verifyPassword(oldPassword, userWithHash.rows[0].password_hash);
  
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update password
  const updateQuery = `
    UPDATE users
    SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, email, role
  `;
  
  const result = await db.query(updateQuery, [hashedPassword, userId]);
  return result.rows[0];
};

// Deactivate user account
export const deactivateUser = async (userId) => {
  const query = `
    UPDATE users
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, email, is_active
  `;
  
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

// Reactivate user account
export const reactivateUser = async (userId) => {
  const query = `
    UPDATE users
    SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, email, is_active
  `;
  
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

// Log audit event
export const logAuditEvent = async (userId, action, resourceType, resourceId, changes = null, ipAddress = null, userAgent = null) => {
  const query = `
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes_json, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, created_at
  `;
  
  try {
    const result = await db.query(query, [
      userId,
      action,
      resourceType,
      resourceId,
      changes ? JSON.stringify(changes) : null,
      ipAddress,
      userAgent
    ]);
    return result.rows[0];
  } catch (error) {
    // Silently fail audit logging to not break main flows
    console.error('[AUDIT] Failed to log event:', error.message);
    return null;
  }
};
