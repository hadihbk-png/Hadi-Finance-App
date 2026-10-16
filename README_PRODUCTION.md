# 🏦 FINORA Financial Advisory Platform

**Production-Ready Financial Planning Application with Secure Multi-Role Portals**

> **IMPORTANT:** This is a demonstration platform designed for educational purposes. It should not be used with real client financial data without professional security, compliance, and regulatory review.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Features](#features)
4. [Security](#security)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Database Setup](#database-setup)
9. [User Roles](#user-roles)
10. [API Endpoints](#api-endpoints)
11. [Deployment](#deployment)
12. [Financial Disclaimers](#financial-disclaimers)
13. [Production Considerations](#production-considerations)
14. [Troubleshooting](#troubleshooting)

---

## Overview

FINORA is a comprehensive financial planning platform featuring:

- **Three Secure Portals:** Client, Advisor, and Admin dashboards with role-based access control
- **Financial Planning Tools:** Net worth calculator, savings goals, compound growth, mortgage calculator, retirement planner
- **Financial Health Assessment:** 6-step questionnaire evaluating financial wellness
- **Investment Risk Analysis:** Determine risk tolerance and view suitable allocations
- **Audit Logging:** Track all user actions for compliance and security
- **Enterprise Security:** Bcryptjs password hashing, session management, input sanitization, rate limiting

---

## Technology Stack

### Frontend
- **Framework:** Vanilla JavaScript (ES6+)
- **Build Tool:** Vite
- **Styling:** CSS3
- **No Frameworks:** Minimal dependencies for security and performance

### Backend
- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Authentication:** express-session + bcryptjs
- **Security:** Helmet, express-rate-limit, input validator
- **Database:** PostgreSQL with connection pooling

### Database
- **Primary:** PostgreSQL 12+
- **Recommended:** Neon.tech (managed PostgreSQL)
- **Alternative:** Local PostgreSQL for development
- **Tables:** 24 tables with proper indexes and foreign keys

### Deployment
- **Frontend:** Vite build → Static hosting (Vercel, Netlify, S3)
- **Backend:** Node.js → Platform service (Vercel, Heroku, DigitalOcean)
- **Database:** Neon PostgreSQL (cloud-managed)

---

## Features

### Client Portal (`/client-dashboard.html`)
- **Financial Overview:** Net worth, savings rate, emergency fund status
- **Health Score:** Personalized financial wellness evaluation
- **Goals Tracking:** Monitor progress toward financial objectives
- **Retirement Readiness:** Projections and funding gap analysis
- **Risk Profile:** Personalized investment risk assessment

### Advisor Portal (`/advisor-dashboard.html`)
- **Client Management:** View assigned clients with health metrics
- **Client 360:** Comprehensive client financial view
- **Task Management:** Track follow-ups and action items
- **Priority List:** Identify clients needing attention
- **Private Notes:** Maintain confidential client observations

### Admin Portal (`/admin-dashboard.html`)
- **User Management:** Create, activate, deactivate users
- **Role Assignment:** Assign advisors to clients
- **Audit Logs:** Complete activity tracking
- **System Statistics:** Monitor platform health

### Public Pages
- **Home:** Landing page with service overview
- **Calculators Hub:** Financial planning tools
  - Net Worth Calculator
  - Savings Goal Tracker
  - Compound Growth Calculator
  - Mortgage Calculator
  - Education Savings Planner
  - Investment Scenario Analyzer
- **Health Assessment:** 6-step financial wellness questionnaire
- **Risk Assessment:** Investment risk tolerance evaluation
- **Retirement Planner:** Retirement projection tool
- **Goals:** Financial goal setting and management
- **Insights:** Educational financial articles
- **Investment Planning:** Asset allocation guidance
- **About:** Company information
- **Services:** Service descriptions
- **Contact:** Contact form

### Legal/Compliance Pages
- **Privacy Policy:** Data collection and protection
- **Terms of Use:** Legal terms and conditions
- **Financial Disclaimer:** Risk disclaimers and limitations
- **Error Pages:** 404, 403, 500 branded error screens

---

## Security

### Authentication & Authorization
- ✅ **Session-Based Auth:** Express-session with PostgreSQL store (fallback to memory)
- ✅ **Password Hashing:** Bcryptjs (10 salt rounds), never stored in plain text
- ✅ **Role-Based Access Control:** CLIENT, ADVISOR, ADMIN
- ✅ **Session Cookies:** httpOnly, Secure (HTTPS), SameSite=Lax
- ✅ **Rate Limiting:** 5 login attempts per 15 minutes per IP

### Data Protection
- ✅ **SQL Injection:** Prepared statements prevent injection attacks
- ✅ **XSS Protection:** Input sanitization and HTML escaping
- ✅ **CSRF Protection:** Session tokens prevent cross-site attacks
- ✅ **Data Isolation:** Users can only access authorized data
- ✅ **Encryption:** HTTPS recommended for production

### Audit & Compliance
- ✅ **Audit Logging:** All actions tracked with timestamps and IP
- ✅ **Session Logging:** Login/logout recorded
- ✅ **Data Access Logging:** Financial data access tracked
- ✅ **Administrative Actions:** User management tracked

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options: DENY (prevent clickjacking)
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HTTPS enforcement)
- Referrer-Policy: strict-origin-when-cross-origin

---

## Installation

### Prerequisites
- Node.js 16+ ([download](https://nodejs.org))
- npm 8+
- PostgreSQL 12+ (or Neon account for cloud option)

### Setup Steps

**1. Clone or Download Repository**
```bash
# If using Git:
git clone <your-repo-url> finora-advisory
cd finora-advisory

# Or unzip the downloaded folder
cd finora-advisory
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Environment**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your configuration:
# - DATABASE_URL (optional, uses memory store if empty)
# - SESSION_SECRET (required for production)
# - PORT (default: 3001)
# - NODE_ENV (development or production)
```

**4. Initialize Database (Optional)**
```bash
# Create tables and schema
npm run db:migrate

# Seed test users (development only)
npm run db:seed-test
```

---

## Configuration

### Environment Variables

**Required for Production:**
```env
# Database Connection
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Session Security
SESSION_SECRET=<generate-with-crypto-below>

# Server Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Generate Strong SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Optional/Development:**
```env
# If DATABASE_URL not set, uses in-memory storage
# Leave empty for development without database

# Default CORS origins (development)
CORS_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177
```

### Database Choices

#### Option 1: Neon PostgreSQL (Recommended for Production)
```
1. Create free account: https://console.neon.tech
2. Create project and database
3. Copy "Pooled connection" string
4. Set DATABASE_URL in .env
```

#### Option 2: Local PostgreSQL (Development)
```bash
# Create database
createdb finora_dev

# Update .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/finora_dev
```

#### Option 3: Memory Store (No Database - Development Only)
```bash
# Leave DATABASE_URL empty in .env
# Sessions stored in memory, lost on server restart
# Perfect for frontend testing
```

---

## Running the Application

### Start Both Servers

**Option A: Separate Terminals (Recommended)**

Terminal 1 - Backend:
```bash
npm run server
# Runs on http://localhost:3001
```

Terminal 2 - Frontend:
```bash
npm run dev
# Runs on http://localhost:5174, 5175, 5176, or 5177 (auto-increments if ports busy)
```

**Option B: Using npm-run-all (Single Terminal)**
```bash
npm install -D npm-run-all
# Then in package.json scripts, add:
# "start:all": "npm-run-all --parallel server dev"
npm run start:all
```

### Access the Application

- **Home Page:** http://localhost:5176
- **Login:** http://localhost:5176/login.html
- **Client Portal:** http://localhost:5176/client-dashboard.html
- **Advisor Portal:** http://localhost:5176/advisor-dashboard.html
- **Admin Portal:** http://localhost:5176/admin-dashboard.html

---

## Database Setup

### Schema Overview

The database includes 24 tables organized by feature:

**Authentication & Users**
- `users` - User accounts with roles
- `advisors` - Advisor profiles
- `audit_logs` - Security audit trail

**Client Data**
- `client_profiles` - Personal information
- `client_savings` - Bank account data
- `client_income` - Income sources
- `client_investments` - Investment holdings
- `client_liabilities` - Debt information
- `client_cashflow` - Monthly budget

**Financial Planning**
- `client_goals` - Financial goals
- `client_health_assessments` - Wellness surveys
- `risk_assessments` - Risk profile results
- `retirement_plans` - Retirement projections

**Relationship Management**
- `advisor_clients` - Advisor-client assignments
- `advisor_private_notes` - Confidential notes
- `advisor_tasks` - Task management
- `activities` - User activity log

**Consultation & Support**
- `consultation_requests` - Demo request forms
- `calculator_results` - Saved calculator outputs
- `sessions` - Session management

### Creating Tables

```bash
npm run db:migrate
```

This reads `server/schema.sql` and creates all tables with:
- Primary keys and indexes
- Foreign key constraints
- Default values
- NOT NULL constraints

### Seeding Test Data

```bash
npm run db:seed-test
```

Creates test users:
- **Client:** client@finora.com / SecurePass123!
- **Advisor:** advisor@finora.com / SecurePass123!
- **Admin:** admin@finora.com / SecurePass123!

Plus sample financial data for testing.

---

## User Roles

### CLIENT Role
**Permissions:**
- View own financial dashboard
- Access own financial data only
- Use public calculators
- Set and track goals
- View assigned advisor recommendations
- Change own password

**Restrictions:**
- Cannot view other clients' data
- Cannot access advisor or admin pages
- Cannot create users
- Cannot see audit logs
- Cannot view other clients' goals

### ADVISOR Role
**Permissions:**
- View assigned clients' data
- Create and update client notes (private)
- Manage tasks and priorities
- View client 360-degree profile
- Access own performance dashboard
- Change own password

**Restrictions:**
- Cannot view clients not assigned
- Cannot access other advisors' clients
- Cannot create users or assignments
- Cannot access admin functions
- Cannot modify client financial data directly

### ADMIN Role
**Permissions:**
- View all users and roles
- Create, activate, deactivate user accounts
- Assign advisors to clients
- View complete audit logs
- System configuration and maintenance
- Change any user's password (with consent)

**Restrictions:**
- Should NOT access client financial data
- Should NOT act as advisor for clients
- Separates administrative from advisory roles

---

## API Endpoints

### Authentication Endpoints

```
POST /api/auth/login
  Body: { email, password }
  Response: { success, user: { id, email, role } }

POST /api/auth/logout
  Response: { success }

POST /api/auth/register
  Body: { email, password, role }
  Response: { success, user }

GET /api/auth/me
  Response: { user: { id, email, role } }

POST /api/auth/session-check
  Response: { authenticated, role, userId }

POST /api/auth/change-password
  Body: { oldPassword, newPassword }
  Response: { success }
```

### Client Portal Endpoints

```
GET /api/client/dashboard
  Response: { dashboard: { profile, financialHealth, netWorth, cashFlow, financialPlan, retirementReadiness } }

GET /api/client/goals
  Response: { goals: [...] }

POST /api/client/goals
  Body: { name, type, target, targetDate }
  Response: { goal }

GET /api/client/retirement
  Response: { retirement: { target_retirement_age, projected_fund, required_fund, funding_gap } }

GET /api/client/risk
  Response: { risk: { risk_score, risk_profile, created_at } }

POST /api/client/scenarios
  Body: { scenario_type, parameters }
  Response: { scenario: {...} }
```

### Advisor Portal Endpoints

```
GET /api/advisor/dashboard
  Response: { dashboard: { totalClients, newClients, clientsNeedingAttention, openTasks, avgHealthScore, aum } }

GET /api/advisor/clients
  Response: { clients: [...] }

GET /api/advisor/clients/:clientId
  Response: { client: { profile, overview, health, risk, goals, retirement, notes, activities } }

POST /api/advisor/notes
  Body: { clientId, title, content, isVisibleToClient }
  Response: { note }

GET /api/advisor/tasks
  Response: { tasks: [...] }

POST /api/advisor/tasks
  Body: { clientId, taskType, dueDate, priority }
  Response: { task }

GET /api/advisor/priority-list
  Response: { priorityList: [...] }
```

### Admin Portal Endpoints

```
GET /api/admin/dashboard
  Response: { dashboard: { userCounts, activeSessions, auditActivity, recentActivity } }

GET /api/admin/users
  Response: { users: [...] }

POST /api/admin/users
  Body: { email, password, role, name }
  Response: { user }

PUT /api/admin/users/:userId/deactivate
  Response: { success }

PUT /api/admin/users/:userId/reactivate
  Response: { success }

POST /api/admin/advisor-assignment
  Body: { advisorId, clientId }
  Response: { assignment }

GET /api/admin/audit-logs?limit=100
  Response: { auditLogs: [...] }
```

---

## Deployment

### Frontend Deployment (Vercel Recommended)

```bash
# Build for production
npm run build

# Output in ./dist/ folder
```

**Deploy to Vercel:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Deploy to Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

**Deploy to AWS S3 + CloudFront:**
```bash
# Build
npm run build

# Upload dist/ to S3 bucket
# Configure CloudFront for caching
```

### Backend Deployment (Vercel, Heroku, DigitalOcean)

**Vercel:**
```bash
# Create vercel.json:
```json
{
  "version": 2,
  "builds": [
    { "src": "server/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "server/index.js" }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "SESSION_SECRET": "@session_secret",
    "NODE_ENV": "production"
  }
}
```

```bash
vercel deploy --prod
```

**Environment Variables on Vercel:**
1. Go to Settings → Environment Variables
2. Add: DATABASE_URL, SESSION_SECRET, CORS_ORIGINS

**Database (Neon):**
1. Create Neon account and project
2. Copy connection string
3. Add as DATABASE_URL environment variable
4. Run migrations: `npm run db:migrate` (after deployment)

---

## Financial Disclaimers

### Important: Not Financial Advice

**FINORA is an educational platform, NOT a regulated financial advisory service.**

The platform does NOT:
- Provide investment recommendations
- Offer personalized financial advice
- Constitute fiduciary advice
- Replace professional financial planners
- Provide tax or legal advice

**Calculators & Projections:**
- Results are estimates based on assumptions
- Actual outcomes will likely differ
- Market conditions are unpredictable
- Past performance ≠ future results
- Calculations do NOT include all costs (taxes, fees, insurance)

**Before using financial data from FINORA:**
1. Verify calculations independently
2. Consult a CFP (Certified Financial Planner)
3. Consult a tax professional for tax implications
4. Consult an attorney for legal matters
5. Never rely solely on automated calculations

**See Also:**
- [Financial Disclaimer](/financial-disclaimer.html)
- [Terms of Use](/terms-of-use.html)
- [Privacy Policy](/privacy-policy.html)

---

## Production Considerations

### Before Going Live with Real Data

#### Security Requirements
- [ ] Professional security audit by external firm
- [ ] Penetration testing completed
- [ ] SSL/TLS certificate installed
- [ ] All environment variables secured (not in code)
- [ ] Database credentials encrypted
- [ ] Regular security updates planned
- [ ] Incident response plan documented

#### Compliance & Legal
- [ ] Legal review of disclaimers
- [ ] Privacy policy reviewed by attorney
- [ ] Terms of service reviewed by attorney
- [ ] GDPR compliance assessment (if serving EU)
- [ ] CCPA compliance (if serving California)
- [ ] Data retention policy documented
- [ ] Data breach notification plan

#### Financial Services Licensing
- [ ] Regulatory status determined (depends on jurisdiction)
- [ ] Applicable licenses/registrations obtained if required
- [ ] Compliance officer assigned
- [ ] Advisor licensing verified (CFP, Series 7, etc. if offering advice)
- [ ] Insurance obtained (errors & omissions, cyber liability)
- [ ] Regular compliance audits scheduled

#### Technical Requirements
- [ ] Load testing completed
- [ ] Backup and disaster recovery plan
- [ ] Monitoring and alerting configured
- [ ] Auto-scaling configured for traffic
- [ ] Database backup strategy implemented
- [ ] Database encryption enabled
- [ ] Logs retained for audit trail (minimum 1-3 years)

#### Operational Requirements
- [ ] Support team trained
- [ ] Documentation complete
- [ ] User onboarding process
- [ ] Account management procedures
- [ ] Escalation procedures documented
- [ ] SLA (Service Level Agreement) defined
- [ ] Uptime monitoring configured

### Financial Calculation Transparency

All financial calculations should include:
- Methodology documentation
- Assumption documentation
- Limitations and risks
- "How this is calculated" sections
- Ability to adjust all parameters
- Clear output of intermediate calculations

Example for retirement projection:
```
Calculation Method: Future Value of Annuity Due
Formula: FV = PMT × [((1 + r)^n - 1) / r] × (1 + r)

Assumptions:
- Annual return: 7% (historical average S&P 500)
- Inflation: 2.5% annually
- Contributions: $500/month, assumed constant
- Time horizon: 25 years
- No withdrawals until retirement

Risks:
- Market downturns can significantly reduce values
- Actual returns vary year-to-year
- Inflation may exceed assumptions
- Personal circumstances may change

View detailed breakdown...
```

---

## Troubleshooting

### Common Issues

**Backend not running**
```bash
# Check port 3001 is available
# Windows: netstat -ano | findstr :3001
# Mac/Linux: lsof -i :3001

# Kill process using port
# Windows: taskkill /PID <pid> /F
# Mac/Linux: kill -9 <pid>

# Then restart
npm run server
```

**Database connection error**
```bash
# Check DATABASE_URL in .env
# Verify connection string format
# Test connection: psql <connection-string>

# If using Neon, verify:
# 1. Neon project is active
# 2. Connection string is current
# 3. IP allowlist configured (if applicable)
```

**CORS error**
```bash
# Check CORS_ORIGINS in .env includes your frontend URL
# Default: http://localhost:5176
# If frontend on different port, add that port
```

**Session not persisting**
```bash
# If DATABASE_URL not set, uses MemoryStore
# Sessions lost on server restart (normal for development)
# Set DATABASE_URL to persist sessions
```

**404 errors on private pages**
```bash
# Verify you're logged in
# Check browser DevTools (F12) for login errors
# Ensure session is active (check cookies)
```

**Port already in use**
```bash
# Frontend: Vite auto-increments port (5174, 5175, 5176, 5177...)
# If all busy, close other projects or specify different port:
npm run dev -- --port 5180
```

---

## File Structure

```
finora-advisory/
├── server/                     # Backend (Node.js)
│   ├── index.js               # Express app & middleware
│   ├── db.js                  # Database connection
│   ├── auth.js                # Authentication utilities
│   ├── middleware.js          # Security middleware
│   ├── schema.sql             # Database schema
│   ├── migrate.js             # Migration runner
│   ├── seed.js                # Data seeding
│   ├── seed-test-users.js    # Test account seeding
│   └── routes/
│       ├── auth.js            # Authentication endpoints
│       ├── client.js          # Client portal endpoints
│       ├── advisor.js         # Advisor portal endpoints
│       └── admin.js           # Admin portal endpoints
│
├── src/                        # Frontend source
│   ├── main.js                # Navigation & layout
│   ├── calculators-hub.js    # All 6 calculators
│   ├── health-assessment.js  # Wellness questionnaire
│   ├── risk-assessment.js    # Risk tolerance survey
│   ├── investment-planning.js # Asset allocation
│   ├── insights.js            # Educational articles
│   ├── currency.js            # Formatting utilities
│   ├── nav.js                 # Navigation component
│   ├── goals.js               # Goal management
│   ├── contact.js             # Contact form
│   ├── retirement-planner.js # Retirement tool
│   └── style.css              # Global styles
│
├── public/                     # Static assets
│   └── images/                # Background images, logos
│
├── *.html                      # Page files
│   ├── index.html             # Home page
│   ├── login.html             # Login portal
│   ├── client-dashboard.html  # Client portal
│   ├── advisor-dashboard.html # Advisor portal
│   ├── admin-dashboard.html   # Admin portal
│   ├── calculators.html       # Calculator hub
│   ├── health-assessment.html # Assessment form
│   ├── risk-assessment.html   # Risk survey
│   ├── retirement-planner.html# Retirement planner
│   ├── investment-planning.html# Asset allocation
│   ├── insights.html          # Articles
│   ├── goals.html             # Goal setting
│   ├── services.html          # Services info
│   ├── about.html             # About company
│   ├── contact.html           # Contact form
│   ├── privacy-policy.html    # Privacy
│   ├── terms-of-use.html      # Terms
│   ├── financial-disclaimer.html # Disclaimers
│   ├── 404.html               # Not found
│   ├── 403.html               # Forbidden
│   └── 500.html               # Server error
│
├── dist/                       # Production build output
├── node_modules/              # Dependencies
├── .env                        # Environment variables (git ignored)
├── .env.example                # Example environment file
├── .gitignore                  # Git ignore rules
├── package.json                # Project metadata
├── vite.config.js             # Vite configuration
└── README.md                   # This file
```

---

## License & Attribution

FINORA is a demonstration educational platform.

### Open Source Dependencies
- **Express.js** - MIT License
- **bcryptjs** - MIT License
- **Helmet** - MIT License
- **Validator.js** - MIT License
- **Vite** - MIT License

### Design Credits
- Premium financial design system
- FINORA brand (demonstration use)

---

## Support & Questions

- **Issues:** Check the troubleshooting section above
- **Security:** Report vulnerabilities responsibly
- **Feature Requests:** Document in GitHub issues
- **Contact:** See contact form at `/contact.html`

---

## Summary

FINORA is a complete, educational financial planning platform with:
- ✅ Three secure role-based portals
- ✅ Enterprise-grade authentication
- ✅ Comprehensive financial tools
- ✅ Production-ready code structure
- ✅ Extensive security features

**Remember:** This is a demonstration platform. Do not use with real client data without professional security and compliance review.

**For production use, consult:**
- Security professionals
- Legal counsel
- Compliance experts
- Regulatory authorities

---

**Last Updated:** September 2026  
**Version:** 1.0.0  
**Status:** Production-Ready Demonstration Platform
