# FINORA FINANCIAL ADVISOR - Phase 4 Secure Portal Setup

## 🚀 Quick Start

The FINORA platform now includes **three secure portals** with role-based access:
- 🏢 **Admin Portal** - System management & user administration
- 📊 **Advisor Portal** - Client management & wealth planning
- 💼 **Client Portal** - Financial dashboard & goal tracking

All portals use **enterprise-grade security** with encrypted sessions, hashed passwords, and comprehensive audit logging.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- PostgreSQL database (Neon.tech recommended, or local)
- VS Code or similar editor

## ⚙️ Step 1: Set Up Your Database

### Option A: Neon PostgreSQL (Recommended - Free Cloud)

1. Go to https://console.neon.tech and create account
2. Create a new project
3. Copy the **Pooled connection** string
4. Should look like: `postgresql://user:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require`

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database: `CREATE DATABASE finora_dev;`
3. Connection string: `postgresql://postgres:password@localhost:5432/finora_dev`

### Option C: Development Mode (No Database Required)

For quick testing without a database:
- Leave DATABASE_URL empty in .env
- Sessions stored in memory
- Perfect for frontend testing
Open `.gitignore` and ensure it contains:
```
.env
.env.local
.env.*.local
node_modules/
dist/
```

## 📦 Step 3: Install Dependencies

```bash
# Install all required packages
npm install

# This installs Express, PostgreSQL client, Vite, and all dependencies
```

## 🏗️ Step 4: Create Database Tables

### 4.1 Run the Schema Migration

```bash
# This creates all database tables in your Neon database
node server/migrate.js
```

This command:
- Reads `server/schema.sql`
- Connects to your Neon database using DATABASE_URL
- Creates all necessary tables
- Outputs success/error messages

If you see errors like "table already exists", that's OK - it means your schema is already in place.

## 🌱 Step 5: Populate with Sample Data

### 5.1 Run the Seed Script

```bash
# This inserts realistic sample data (20 clients, 3 advisors, 40 goals, etc.)
node server/seed.js
```

This creates:
- **3 Sample Advisors** with realistic profiles
- **20 Sample Clients** with diverse demographics
- **40 Financial Goals** across different types
- **20 Risk Assessments** with different risk profiles
- **20 Retirement Plans** showing various scenarios
- **10 Consultation Requests** ready for follow-up
- **20 Financial Assessments** with calculated scores

### 5.2 Verify Sample Data

Check that data was inserted by running:

```bash
# Check advisors
sqlite3 (for local) or connect to Neon console
SELECT COUNT(*) FROM advisors;
SELECT COUNT(*) FROM client_profiles;
SELECT COUNT(*) FROM financial_goals;
```

## 🚀 Step 6: Start the Development Server

### 6.1 Start Backend (Express API)

```bash
npm run dev:server
```

or

```bash
node server/index.js
```

Expected output:
```
✓ FINORA API Server running on http://localhost:3001
✓ Database: Neon PostgreSQL
✓ Static assets serving from project root
```

### 6.2 Start Frontend (Vite Dev Server) - In a New Terminal

```bash
npm run dev
```

Expected output:
```
VITE v6.2.0  ready in 123 ms

➜  Local:   http://localhost:5175/
➜  press h to show help
```

### 6.3 Open in Browser

Open http://localhost:5175 in your web browser

You should see the FINORA homepage with all sections visible and working.

## ✅ Step 7: Test All Pages

### Test Calculators
- [ ] Net Worth Calculator: http://localhost:5175/net-worth-calculator.html
- [ ] Savings Calculator: http://localhost:5175/savings-calculator.html
- [ ] Calculators Hub: http://localhost:5175/calculators.html

### Test Assessments
- [ ] Financial Health Assessment: http://localhost:5175/health-assessment.html
- [ ] Risk Profile Assessment: http://localhost:5175/risk-assessment.html
- [ ] Goals Planner: http://localhost:5175/goals.html

### Test Planning Tools
- [ ] Investment Planning: http://localhost:5175/investment-planning.html
- [ ] Retirement Planner: http://localhost:5175/retirement-planner.html

### Test Information Pages
- [ ] Services: http://localhost:5175/services.html
- [ ] About: http://localhost:5175/about.html
- [ ] Contact/Consultation: http://localhost:5175/contact.html
- [ ] Insights/Knowledge: http://localhost:5175/insights.html

### Test Database Connection
- [ ] Check DB status: http://localhost:3001/api/db/status

You should see a JSON response showing:
```json
{
  "database": "Neon PostgreSQL",
  "connected": true,
  "mode": "Neon Production Relational DB",
  "tableCounts": {
    "advisors": 3,
    "client_profiles": 20,
    "financial_goals": 40,
    ...
  }
}
```

## 🗄️ Database Schema Overview

### Core Tables

**advisors** - Financial advisors
- Stores advisor profiles, contact info, specialties

**client_profiles** - Client accounts
- Stores client demographics, contact info, assignment to advisors

**financial_assessments** - Health diagnostic scores
- Stores complete financial health audits with component scores

**financial_goals** - Client goal tracking
- Tracks savings goals with target amounts, timelines, progress

**risk_assessments** - Risk profile questionnaires
- Stores risk profile analysis results

**retirement_plans** - Retirement projections
- Stores retirement modeling calculations

**consultation_requests** - Advisory booking requests
- Stores form submissions from potential clients

**calculator_results** - Saved calculator snapshots
- Stores results from calculators for future reference

[Full schema with 18+ tables in `server/schema.sql`]

## 🔐 Security Best Practices

### What We Do Right
✓ Environment variables for sensitive data
✓ Connection pooling for performance
✓ SQL prepared statements (no injection vulnerability)
✓ SSL/TLS encryption for database connection
✓ No credentials in source code

### What You Should Do
- [ ] Never share your `.env` file
- [ ] Never commit `.env` to Git
- [ ] Rotate database credentials periodically
- [ ] Use HTTPS in production
- [ ] Enable Neon's IP allowlisting in production
- [ ] Implement authentication before going live
- [ ] Use environment-specific configurations

## 📊 Sample Data Overview

### Advisors (3 total)
- Eleanor Vance, CFP® - Family Wealth Specialist
- Julian Montgomery, CFA® - Investment Strategist
- Dr. Beatrice Sterling, PhD, CFP® - Retirement Specialist

### Clients (20 total)
- Ages: 25-65
- Income: $165k-$520k
- Net worth: $750k-$4.1M
- Various family structures and employment types

### Financial Goals (40 total)
- Emergency Fund, Home Purchase, Education
- Retirement, Major Purchases, Travel
- Investment Building, Weddings
- Status: All "In Progress" (realistic ongoing scenarios)

### Risk Assessments (20 total)
- Profiles: Balanced, Conservative, Growth-oriented
- Scores calculated from questionnaire responses

### Retirement Plans (20 total)
- Current age: Primarily 45 years old (sample scenario)
- Target retirement age: 65 (20-year horizon)
- Readiness status: Mix of "On Track" and "Needs Attention"

## 🐛 Troubleshooting

### Issue: "DATABASE_URL is not set"
**Solution:** Check that `.env` file exists in project root with DATABASE_URL defined

## 🔐 Phase 4: Secure Portal Implementation

### Portal Overview

FINORA now features three independent portals with enterprise-grade security:

#### 1. Admin Portal (`/admin-dashboard.html`)
**Purpose:** System administration and user management

**Features:**
- System overview dashboard with user statistics
- User management (create, activate, deactivate)
- Advisor-client assignments
- Comprehensive audit logging
- Real-time activity monitoring

**Test Account:**
- Email: `admin@finora.com`
- Password: `SecurePass123!`

#### 2. Advisor Portal (`/advisor-dashboard.html`)
**Purpose:** Client management and relationship oversight

**Features:**
- Personal dashboard with client metrics
- Client list with health scores and net worth
- Client 360-degree view with profile and financials
- Task management for follow-ups
- Priority list for clients needing attention
- Private notes for client collaboration

**Test Account:**
- Email: `advisor@finora.com`
- Password: `SecurePass123!`

#### 3. Client Portal (`/client-dashboard.html`)
**Purpose:** Personal financial dashboard and goal tracking

**Features:**
- Financial health score and net worth tracking
- Savings rate and emergency fund monitoring
- Retirement readiness assessment
- Personal goals with progress tracking
- AI-generated financial recommendations
- Risk profile display

**Test Account:**
- Email: `client@finora.com`
- Password: `SecurePass123!`

### Security Features

All portals include:
- ✅ **Session-based authentication** with secure cookies (httpOnly, sameSite=lax)
- ✅ **Bcryptjs password hashing** (10 salt rounds)
- ✅ **Role-based access control** (CLIENT/ADVISOR/ADMIN)
- ✅ **Data isolation** - users only see their authorized data
- ✅ **Audit logging** - all actions tracked with timestamps and IP addresses
- ✅ **Rate limiting** - 5 login attempts per 15 minutes
- ✅ **Input sanitization** - XSS protection
- ✅ **CORS configured** - localhost:5174, 5175, 5176
- ✅ **Helmet security headers** - CSP, X-Frame-Options, etc.

### Starting the Portals

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Set Up Database (Optional - for persistent data)
```bash
npm run db:migrate
npm run db:seed-test
```

If DATABASE_URL is not set, the system uses:
- In-memory session store for development
- You can still test login and UI functionality

#### Step 3: Start Backend Server
```bash
npm run server
```

Expected output:
```
✓ FINORA Financial Advisory Server running on http://localhost:3001
  Authentication System: ACTIVE
  Security Headers: ENABLED (Helmet)
  Session Management: ENABLED
  Roles: CLIENT | ADVISOR | ADMIN
```

#### Step 4: Start Frontend Dev Server (New Terminal)
```bash
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:5176/
```

### Portal URLs

Once both servers are running:

| Portal | Login URL | Dashboard URL |
|--------|-----------|--------------|
| **Client** | http://localhost:5176/login.html | http://localhost:5176/client-dashboard.html |
| **Advisor** | http://localhost:5176/login.html | http://localhost:5176/advisor-dashboard.html |
| **Admin** | http://localhost:5176/login.html | http://localhost:5176/admin-dashboard.html |

All portals use the same login page. Select your role, enter credentials, and the system redirects to the appropriate dashboard.

### Testing Checklist

#### Authentication
- [ ] Login with each role (client, advisor, admin)
- [ ] Each role redirects to correct dashboard
- [ ] Logout destroys session
- [ ] Incorrect credentials show error
- [ ] Password field toggles visibility
- [ ] Session persists on page refresh (if DATABASE_URL configured)

#### Client Portal
- [ ] Financial Health Score displays
- [ ] Net Worth calculation shows
- [ ] Savings rate and emergency fund visible
- [ ] Retirement readiness status shown
- [ ] Goals tab shows personal goals
- [ ] Progress bars calculate correctly
- [ ] Retirement tab displays projections
- [ ] Risk profile tab shows assessment
- [ ] Cannot view other clients' data

#### Advisor Portal
- [ ] Dashboard metrics update correctly
- [ ] Client list displays assigned clients
- [ ] Health scores shown for each client
- [ ] Client search/filter works
- [ ] Tasks tab shows pending work
- [ ] Priority list highlights urgent clients
- [ ] Cannot access admin features
- [ ] Cannot view non-assigned clients

#### Admin Portal
- [ ] Dashboard shows system statistics
- [ ] User count displays by role
- [ ] User management lists all users
- [ ] Can filter by role and status
- [ ] Can deactivate/reactivate users
- [ ] Audit logs show recent actions
- [ ] Can filter audit logs by user and action
- [ ] Cannot accidentally delete users (soft-delete only)

### API Endpoints Reference

**Authentication Endpoints:**
- `POST /api/auth/login` - Login with email & password
- `POST /api/auth/logout` - Destroy session
- `POST /api/auth/register` - Register new client
- `GET /api/auth/me` - Get current user
- `POST /api/auth/session-check` - Check authentication status

**Client Portal Endpoints:**
- `GET /api/client/dashboard` - Financial overview & recommendations
- `GET /api/client/goals` - List client's goals
- `GET /api/client/retirement` - Retirement projections
- `GET /api/client/risk` - Risk profile assessment

**Advisor Portal Endpoints:**
- `GET /api/advisor/dashboard` - Advisor metrics & overview
- `GET /api/advisor/clients` - List assigned clients
- `GET /api/advisor/clients/:id` - Client 360 view
- `GET /api/advisor/tasks` - Advisor's tasks
- `GET /api/advisor/priority-list` - Clients needing attention

**Admin Portal Endpoints:**
- `GET /api/admin/dashboard` - System statistics
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id/deactivate` - Deactivate user
- `PUT /api/admin/users/:id/reactivate` - Reactivate user
- `GET /api/admin/audit-logs` - System audit trail

### Environment Configuration

Your `.env` file should include:

```env
# Database (Optional - for persistent sessions)
DATABASE_URL=postgresql://user:password@...

# Server
PORT=3001
NODE_ENV=development

# CORS Origins (Vite dev server defaults)
CORS_ORIGINS=http://localhost:5174,http://localhost:5175,http://localhost:5176

# Session (Optional - change in production)
SESSION_SECRET=finora-dev-secret
```

### Production Deployment Notes

Before deploying to production:
1. Set `NODE_ENV=production`
2. Use a strong `SESSION_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
3. Configure `CORS_ORIGINS` to your domain
4. Set up PostgreSQL database (Neon or managed service)
5. Enable HTTPS/TLS
6. Use environment-specific secrets management
7. Set secure cookie flags for HTTPS
8. Enable database IP allowlisting
9. Implement rate limiting at proxy level
10. Set up monitoring and alerting

### Issue: "Connection refused" from Neon
**Solution:** 
- Verify CONNECTION_URL in `.env` is correct
- Check that Neon project status is "Available" in console
- Ensure sslmode=require is in connection string

### Issue: "Table already exists"
**Solution:** This is expected if running migrate.js multiple times. Tables are idempotent.

### Issue: "Port 3001 already in use"
**Solution:** 
```bash
# Kill process on port 3001
# Windows: netstat -ano | findstr :3001
# Then: taskkill /PID [PID] /F

# Or use different port:
PORT=3002 npm run dev:server
```

### Issue: "Vite dev server won't start"
**Solution:** Make sure port 5175 is available. If not, Vite will automatically try 5176, 5177, etc.

## 📈 Next Steps After Setup

### 1. Test Data Exploration
- Log into Neon Console
- Query sample data
- Verify data structure

### 2. Form Submission Testing
- Submit a financial health assessment
- Watch data save to database
- Query results in Neon

### 3. Calculator Usage
- Try Net Worth Calculator
- Try Savings Goal Calculator
- Verify calculations are working

### 4. Production Preparation (Future)
- [ ] Set up authentication system
- [ ] Configure HTTPS/SSL
- [ ] Set up automated backups
- [ ] Configure Neon IP allowlist
- [ ] Deploy to production server
- [ ] Set up monitoring/logging

## 🔗 Important Links

- **Neon Console:** https://console.neon.tech
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Express.js Docs:** https://expressjs.com/
- **Vite Docs:** https://vitejs.dev/

## 📞 Support

For issues with:
- **Database:** Check Neon docs or contact Neon support
- **Application:** Review console errors (F12 in browser)
- **API:** Check server logs in terminal
- **Frontend:** Check browser console

## ✨ Features Ready to Use

✅ Premium design system maintained
✅ Responsive layout (mobile, tablet, desktop)
✅ Financial Health Assessment (6-step guided)
✅ Risk Profile Assessment
✅ Financial Goals Tracking
✅ Investment Planning Calculator
✅ Retirement Planner
✅ Net Worth Calculator
✅ Savings Goal Calculator
✅ Compound Growth Calculator
✅ Mortgage Calculator
✅ Education Planner
✅ Consultation Request Form
✅ Multi-currency Support (USD, EUR, GBP, AED)
✅ Sample Data (20 clients, 3 advisors, 40+ goals)
✅ Database (Neon PostgreSQL)

---

**Last Updated:** September 2026
**Version:** 1.0 - Full Stack Financial Advisory Platform
