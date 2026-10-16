/**
 * FINORA Admin Portal Routes
 * Endpoints for user management, system monitoring, audit trails
 */

import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole, auditLog } from '../middleware.js';
import { createUser, reactivateUser, deactivateUser } from '../auth.js';

const router = express.Router();

// GET /api/admin/dashboard
router.get('/dashboard', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Get system statistics
    const stats = {};
    
    // Count users by role
    const usersQuery = `
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE is_active = TRUE
      GROUP BY role
    `;
    const usersResult = await db.query(usersQuery);
    
    stats.usersByRole = {};
    usersResult.rows.forEach(row => {
      stats.usersByRole[row.role] = parseInt(row.count);
    });
    
    // Count total clients, advisors
    const clientsQuery = `SELECT COUNT(*) as count FROM client_profiles`;
    const clientsResult = await db.query(clientsQuery);
    stats.totalClients = parseInt(clientsResult.rows[0].count);
    
    const advisorsQuery = `SELECT COUNT(*) as count FROM advisors`;
    const advisorsResult = await db.query(advisorsQuery);
    stats.totalAdvisors = parseInt(advisorsResult.rows[0].count);
    
    // Get pending consultation requests
    const consultationsQuery = `
      SELECT COUNT(*) as count FROM advisor_consultation_requests 
      WHERE status = 'Pending'
    `;
    const consultationsResult = await db.query(consultationsQuery);
    stats.pendingConsultations = parseInt(consultationsResult.rows[0].count);
    
    // Get active assessments
    const assessmentsQuery = `SELECT COUNT(*) as count FROM financial_assessments`;
    const assessmentsResult = await db.query(assessmentsQuery);
    stats.financialAssessments = parseInt(assessmentsResult.rows[0].count);
    
    // Get audit log summary (last 7 days)
    const auditSummaryQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as event_count
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const auditSummaryResult = await db.query(auditSummaryQuery);
    stats.auditActivity = auditSummaryResult.rows;
    
    res.json({
      success: true,
      dashboard: {
        stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/admin/users
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { role, search, active } = req.query;
    
    let query = `
      SELECT u.id, u.email, u.role, u.is_active, u.created_at,
        CASE WHEN u.role = 'client' THEN 
          (SELECT CONCAT(first_name, ' ', last_name) FROM client_profiles WHERE user_id = u.id)
        ELSE NULL END as client_name,
        CASE WHEN u.role = 'advisor' THEN
          (SELECT COUNT(*) FROM advisor_clients WHERE advisor_id = u.id)
        ELSE NULL END as client_count
      FROM users u
      WHERE 1=1
    `;
    
    const params = [];
    
    if (role) {
      query += ` AND u.role = $${params.length + 1}`;
      params.push(role);
    }
    
    if (active !== undefined) {
      query += ` AND u.is_active = $${params.length + 1}`;
      params.push(active === 'true');
    }
    
    if (search) {
      query += ` AND (u.email ILIKE $${params.length + 1} OR (u.role = 'client' AND (SELECT first_name FROM client_profiles WHERE user_id = u.id) ILIKE $${params.length + 1}))`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        name: u.client_name,
        clientCount: u.client_count,
        createdAt: u.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/users (create new user/advisor)
router.post('/users', requireAuth, requireRole('admin'), auditLog('users'), async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    
    if (!['client', 'advisor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Create user
    const user = await createUser(email, password, role);
    
    // If advisor, create advisor profile
    if (role === 'advisor') {
      const advisorQuery = `
        INSERT INTO advisors (email, full_name, title)
        VALUES ($1, $2, 'Financial Advisor')
        RETURNING id
      `;
      await db.query(advisorQuery, [email, `${firstName || ''} ${lastName || ''}`.trim()]);
    }
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`
    });
  } catch (error) {
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// PUT /api/admin/users/:userId/deactivate
router.put('/users/:userId/deactivate', requireAuth, requireRole('admin'), auditLog('users'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    
    const user = await deactivateUser(userId);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.is_active
      },
      message: 'User deactivated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:userId/reactivate
router.put('/users/:userId/reactivate', requireAuth, requireRole('admin'), auditLog('users'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await reactivateUser(userId);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.is_active
      },
      message: 'User reactivated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/advisor-assignment
router.post('/advisor-assignment', requireAuth, requireRole('admin'), auditLog('advisor_clients'), async (req, res) => {
  try {
    const { advisorId, clientId, action } = req.body;
    
    if (action === 'assign') {
      const assignQuery = `
        INSERT INTO advisor_clients (advisor_id, client_id, relationship_status)
        VALUES ($1, $2, 'Active')
        ON CONFLICT (advisor_id, client_id) 
        DO UPDATE SET relationship_status = 'Active'
        RETURNING *
      `;
      
      const result = await db.query(assignQuery, [advisorId, clientId]);
      
      res.json({
        success: true,
        message: 'Client assigned to advisor',
        assignment: result.rows[0]
      });
    } else if (action === 'remove') {
      const removeQuery = `
        DELETE FROM advisor_clients
        WHERE advisor_id = $1 AND client_id = $2
        RETURNING advisor_id
      `;
      
      await db.query(removeQuery, [advisorId, clientId]);
      
      res.json({
        success: true,
        message: 'Client removed from advisor'
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, action } = req.query;
    
    let query = `
      SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id,
             u.email, al.created_at, al.ip_address
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ` AND al.user_id = $${params.length + 1}`;
      params.push(userId);
    }
    
    if (action) {
      query += ` AND al.action ILIKE $${params.length + 1}`;
      params.push(`%${action}%`);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM audit_logs al
      WHERE 1=1
      ${userId ? `AND al.user_id = '${userId}'` : ''}
      ${action ? `AND al.action ILIKE '%${action}%'` : ''}
    `;
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      auditLogs: result.rows.map(log => ({
        id: log.id,
        user: log.email || 'System',
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        timestamp: log.created_at,
        ipAddress: log.ip_address
      })),
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

export default router;
