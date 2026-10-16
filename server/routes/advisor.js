/**
 * FINORA Advisor Portal Routes
 * Endpoints for advisor dashboard, client management, notes, tasks
 */

import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole, auditLog } from '../middleware.js';

const router = express.Router();

// GET /api/advisor/dashboard
router.get('/dashboard', requireAuth, requireRole('advisor'), async (req, res) => {
  try {
    // Get advisor's clients count
    const clientsCountQuery = `
      SELECT COUNT(*) FROM advisor_clients WHERE advisor_id = $1 AND relationship_status = 'Active'
    `;
    const clientsCountResult = await db.query(clientsCountQuery, [req.user.id]);
    const totalClients = parseInt(clientsCountResult.rows[0].count);
    
    // Get new clients (in last 30 days)
    const newClientsQuery = `
      SELECT COUNT(*) FROM advisor_clients 
      WHERE advisor_id = $1 
      AND assigned_date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const newClientsResult = await db.query(newClientsQuery, [req.user.id]);
    const newClients = parseInt(newClientsResult.rows[0].count);
    
    // Get clients requiring attention (low health scores)
    const attentionClientsQuery = `
      SELECT COUNT(DISTINCT cp.id)
      FROM client_profiles cp
      JOIN advisor_clients ac ON cp.id = ac.client_id
      LEFT JOIN financial_assessments fa ON cp.id = fa.client_id
      WHERE ac.advisor_id = $1
      AND (fa.overall_score < 60 OR fa.overall_score IS NULL)
    `;
    const attentionClientsResult = await db.query(attentionClientsQuery, [req.user.id]);
    const clientsNeedingAttention = parseInt(attentionClientsResult.rows[0].count);
    
    // Get open tasks
    const openTasksQuery = `
      SELECT COUNT(*) FROM advisor_tasks
      WHERE advisor_id = $1 AND status = 'Open'
    `;
    const openTasksResult = await db.query(openTasksQuery, [req.user.id]);
    const openTasks = parseInt(openTasksResult.rows[0].count);
    
    // Get pending consultation requests
    const consultationsQuery = `
      SELECT COUNT(*) FROM advisor_consultation_requests
      WHERE assigned_advisor_id = $1 AND status = 'Pending'
    `;
    const consultationsResult = await db.query(consultationsQuery, [req.user.id]);
    const pendingConsultations = parseInt(consultationsResult.rows[0].count);
    
    // Get average financial health score
    const avgHealthQuery = `
      SELECT AVG(fa.overall_score)::INT as avg_score
      FROM financial_assessments fa
      JOIN client_profiles cp ON fa.client_id = cp.id
      JOIN advisor_clients ac ON cp.id = ac.client_id
      WHERE ac.advisor_id = $1
      AND fa.id IN (
        SELECT DISTINCT ON (client_id) id
        FROM financial_assessments
        WHERE client_id IN (
          SELECT client_id FROM advisor_clients WHERE advisor_id = $1
        )
        ORDER BY client_id, created_at DESC
      )
    `;
    const avgHealthResult = await db.query(avgHealthQuery, [req.user.id]);
    const avgHealthScore = avgHealthResult.rows[0]?.avg_score || null;
    
    // Get total assets under review
    const assetsQuery = `
      SELECT COALESCE(SUM(net_worth_estimate), 0)::BIGINT as total_assets
      FROM client_profiles
      WHERE id IN (
        SELECT client_id FROM advisor_clients WHERE advisor_id = $1 AND relationship_status = 'Active'
      )
    `;
    const assetsResult = await db.query(assetsQuery, [req.user.id]);
    const assetsUnderReview = assetsResult.rows[0]?.total_assets || 0;
    
    res.json({
      success: true,
      dashboard: {
        metrics: {
          totalClients,
          newClients,
          clientsNeedingAttention,
          openTasks,
          pendingConsultations,
          avgHealthScore,
          assetsUnderReview
        },
        alerts: [
          pendingConsultations > 0 && { type: 'consultation', count: pendingConsultations, message: `${pendingConsultations} pending consultation request(s)` },
          clientsNeedingAttention > 0 && { type: 'health', count: clientsNeedingAttention, message: `${clientsNeedingAttention} client(s) with health score < 60` },
          openTasks > 0 && { type: 'task', count: openTasks, message: `${openTasks} open task(s)` }
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Advisor dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/advisor/clients
router.get('/clients', requireAuth, requireRole('advisor'), async (req, res) => {
  try {
    const { search, sort = 'name' } = req.query;
    
    let query = `
      SELECT 
        cp.id, cp.user_id, cp.first_name, cp.last_name, cp.email, cp.net_worth_estimate,
        ac.assigned_date, ac.relationship_status,
        (SELECT overall_score FROM financial_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) as health_score,
        (SELECT risk_profile FROM risk_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) as risk_profile,
        (SELECT MAX(created_at) FROM financial_assessments WHERE client_id = cp.id) as last_review
      FROM client_profiles cp
      JOIN advisor_clients ac ON cp.id = ac.client_id
      WHERE ac.advisor_id = $1 AND ac.relationship_status = 'Active'
    `;
    
    const params = [req.user.id];
    
    if (search) {
      query += ` AND (cp.first_name ILIKE $2 OR cp.last_name ILIKE $2 OR cp.email ILIKE $2)`;
      params.push(`%${search}%`);
    }
    
    // Sorting
    if (sort === 'health') {
      query += ` ORDER BY health_score DESC NULLS LAST`;
    } else if (sort === 'networth') {
      query += ` ORDER BY cp.net_worth_estimate DESC`;
    } else {
      query += ` ORDER BY cp.first_name ASC, cp.last_name ASC`;
    }
    
    const result = await db.query(query, params);
    
    res.json({
      clients: result.rows.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        netWorth: c.net_worth_estimate,
        healthScore: c.health_score,
        riskProfile: c.risk_profile,
        assignedDate: c.assigned_date,
        lastReview: c.last_review
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

// GET /api/advisor/clients/:clientId (Client 360 view)
router.get('/clients/:clientId', requireAuth, requireRole('advisor'), async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verify advisor is authorized to see this client
    const authQuery = `
      SELECT cp.id FROM client_profiles cp
      JOIN advisor_clients ac ON cp.id = ac.client_id
      WHERE cp.id = $1 AND ac.advisor_id = $2
    `;
    
    const authResult = await db.query(authQuery, [clientId, req.user.id]);
    
    if (!authResult.rows[0]) {
      return res.status(403).json({ error: 'You do not have access to this client' });
    }
    
    // Get client profile
    const profileQuery = `SELECT * FROM client_profiles WHERE id = $1`;
    const profileResult = await db.query(profileQuery, [clientId]);
    const profile = profileResult.rows[0];
    
    // Get financial health
    const healthQuery = `SELECT * FROM financial_assessments WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const healthResult = await db.query(healthQuery, [clientId]);
    const health = healthResult.rows[0];
    
    // Get risk profile
    const riskQuery = `SELECT * FROM risk_assessments WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const riskResult = await db.query(riskQuery, [clientId]);
    const risk = riskResult.rows[0];
    
    // Get goals
    const goalsQuery = `SELECT * FROM financial_goals WHERE client_id = $1 ORDER BY priority DESC`;
    const goalsResult = await db.query(goalsQuery, [clientId]);
    const goals = goalsResult.rows;
    
    // Get retirement plan
    const retirementQuery = `SELECT * FROM retirement_plans WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const retirementResult = await db.query(retirementQuery, [clientId]);
    const retirement = retirementResult.rows[0];
    
    // Get net worth
    const netWorthQuery = `
      SELECT 
        (SELECT COALESCE(SUM(current_value), 0) FROM assets WHERE client_id = $1)::BIGINT as total_assets,
        (SELECT COALESCE(SUM(balance), 0) FROM liabilities WHERE client_id = $1)::BIGINT as total_liabilities
    `;
    const netWorthResult = await db.query(netWorthQuery, [clientId]);
    const { total_assets, total_liabilities } = netWorthResult.rows[0];
    
    // Get advisor notes
    const notesQuery = `SELECT * FROM advisor_private_notes WHERE client_id = $1 AND advisor_id = $2 ORDER BY created_at DESC`;
    const notesResult = await db.query(notesQuery, [clientId, req.user.id]);
    const notes = notesResult.rows;
    
    // Get activities
    const activitiesQuery = `SELECT * FROM activities WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20`;
    const activitiesResult = await db.query(activitiesQuery, [clientId]);
    const activities = activitiesResult.rows;
    
    res.json({
      client: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
        primaryGoal: goals.length > 0 ? goals[0].goal_name : null,
        netWorth: total_assets - total_liabilities,
        assets: total_assets,
        liabilities: total_liabilities
      },
      overview: {
        healthScore: health?.overall_score,
        riskProfile: risk?.risk_profile,
        netWorth: total_assets - total_liabilities,
        lastReview: health?.created_at
      },
      health,
      risk,
      goals,
      retirement,
      notes,
      activities: activities.slice(0, 10)
    });
  } catch (error) {
    console.error('Client 360 error:', error);
    res.status(500).json({ error: 'Failed to load client details' });
  }
});

// POST /api/advisor/notes (add private note)
router.post('/notes', requireAuth, requireRole('advisor'), auditLog('advisor_private_notes'), async (req, res) => {
  try {
    const { clientId, title, content, isVisibleToClient } = req.body;
    
    // Verify authorization
    const authQuery = `
      SELECT ac.id FROM advisor_clients ac
      WHERE ac.client_id = $1 AND ac.advisor_id = $2
    `;
    const authResult = await db.query(authQuery, [clientId, req.user.id]);
    
    if (!authResult.rows[0]) {
      return res.status(403).json({ error: 'You do not have access to this client' });
    }
    
    const insertQuery = `
      INSERT INTO advisor_private_notes (advisor_id, client_id, title, content, is_visible_to_client, author_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      req.user.id,
      clientId,
      title,
      content,
      isVisibleToClient || false,
      req.user.id
    ]);
    
    res.status(201).json({
      success: true,
      note: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/advisor/tasks
router.get('/tasks', requireAuth, requireRole('advisor'), async (req, res) => {
  try {
    const tasksQuery = `
      SELECT at.*, cp.first_name, cp.last_name
      FROM advisor_tasks at
      LEFT JOIN client_profiles cp ON at.client_id = cp.id
      WHERE at.advisor_id = $1
      ORDER BY at.due_date ASC, at.priority DESC
    `;
    
    const result = await db.query(tasksQuery, [req.user.id]);
    
    res.json({
      tasks: result.rows.map(t => ({
        id: t.id,
        clientName: t.first_name ? `${t.first_name} ${t.last_name}` : 'General',
        taskType: t.task_type,
        title: t.title,
        dueDate: t.due_date,
        priority: t.priority,
        status: t.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// POST /api/advisor/tasks
router.post('/tasks', requireAuth, requireRole('advisor'), auditLog('advisor_tasks'), async (req, res) => {
  try {
    const { clientId, taskType, title, description, dueDate, priority } = req.body;
    
    const insertQuery = `
      INSERT INTO advisor_tasks (advisor_id, client_id, task_type, title, description, due_date, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Open')
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      req.user.id,
      clientId || null,
      taskType,
      title,
      description,
      dueDate,
      priority || 'Medium'
    ]);
    
    res.status(201).json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/advisor/tasks/:taskId
router.put('/tasks/:taskId', requireAuth, requireRole('advisor'), auditLog('advisor_tasks'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, priority } = req.body;
    
    const updateQuery = `
      UPDATE advisor_tasks
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND advisor_id = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [status, priority, taskId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/advisor/priority-list (clients needing attention)
router.get('/priority-list', requireAuth, requireRole('advisor'), async (req, res) => {
  try {
    const priorityQuery = `
      SELECT 
        cp.id, cp.first_name, cp.last_name,
        (SELECT overall_score FROM financial_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) as health_score,
        (SELECT COUNT(*) FROM advisor_tasks WHERE client_id = cp.id AND advisor_id = $1 AND status = 'Open')::INT as open_tasks,
        (SELECT MAX(created_at) FROM financial_assessments WHERE client_id = cp.id) as last_review,
        ac.assigned_date,
        CASE 
          WHEN (SELECT overall_score FROM financial_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) < 50 THEN 'Critical'
          WHEN (SELECT overall_score FROM financial_assessments WHERE client_id = cp.id ORDER BY created_at DESC LIMIT 1) < 70 THEN 'High'
          WHEN (MAX(fa.created_at) < CURRENT_DATE - INTERVAL '90 days') THEN 'Medium'
          ELSE 'Low'
        END as priority
      FROM client_profiles cp
      JOIN advisor_clients ac ON cp.id = ac.client_id
      LEFT JOIN financial_assessments fa ON cp.id = fa.client_id
      WHERE ac.advisor_id = $1 AND ac.relationship_status = 'Active'
      ORDER BY 
        CASE WHEN health_score < 50 THEN 1
             WHEN health_score < 70 THEN 2
             WHEN last_review < CURRENT_DATE - INTERVAL '90 days' THEN 3
             ELSE 4
        END,
        health_score ASC,
        last_review ASC NULLS FIRST
      LIMIT 20
    `;
    
    const result = await db.query(priorityQuery, [req.user.id]);
    
    res.json({
      priorityList: result.rows.map(row => ({
        clientId: row.id,
        name: `${row.first_name} ${row.last_name}`,
        healthScore: row.health_score,
        priority: row.priority,
        lastReview: row.last_review,
        openTasks: row.open_tasks,
        dayssinceReview: row.last_review ? Math.floor((Date.now() - new Date(row.last_review)) / (1000 * 60 * 60 * 24)) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load priority list' });
  }
});

export default router;
