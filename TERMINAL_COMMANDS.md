# 🖥️ FINORA - TERMINAL QUICK COMMANDS

## Copy & Paste These Commands Into Your Terminal

### ⚡ 30-Second Quick Start

Open **TWO terminal windows** side by side:

**Terminal 1 - Backend:**
```bash
cd "c:\Users\hadih\Hadi Financial Advisor" && npm run server
```

**Terminal 2 - Frontend:**
```bash
cd "c:\Users\hadih\Hadi Financial Advisor" && npm run dev
```

Then open: **http://localhost:5176**

---

## All Available Commands

### Database Operations

**Setup Database (Creates tables + seeds data):**
```bash
npm run db:setup
```

**Create Tables Only:**
```bash
npm run db:migrate
```

**Seed Sample Data Only:**
```bash
npm run db:seed
```

### Server Commands

**Start Backend API:**
```bash
npm run server
```

**Start Frontend Dev Server:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
```

**Preview Production Build:**
```bash
npm run preview
```

### Dependency Management

**Install All Dependencies:**
```bash
npm install
```

**Install Specific Package:**
```bash
npm install [package-name]
```

---

## Checking If Everything Is Working

### Check Backend Status
```
Visit: http://localhost:3001/api/db/status
```

Should show:
```json
{
  "database": "Neon PostgreSQL",
  "connected": false,
  "mode": "Local Sandbox Mode (Awaiting DATABASE_URL in .env)",
  "timestamp": "2026-09-30T17:20:54.8352"
}
```

### Check Frontend Status
```
Visit: http://localhost:5176
```

Should show the beautiful FINORA homepage with hero section.

---

## Troubleshooting Commands

### Port Already In Use?

**Find what's using port 3001:**
```bash
netstat -ano | findstr :3001
```

**Kill the process (replace PID with the number shown):**
```bash
taskkill /PID [PID_NUMBER] /F
```

**Or use a different port:**
```bash
set PORT=3002 && npm run server
```

### Reinstall Dependencies

**Remove and reinstall everything:**
```bash
rmdir /s node_modules
del package-lock.json
npm install
```

### Clear Cache

**Clear Node package cache:**
```bash
npm cache clean --force
```

---

## Adding Your Neon Connection String

### 1. Create .env File

**Location:** `c:\Users\hadih\Hadi Financial Advisor\.env`

**Content:**
```
DATABASE_URL="[YOUR_NEON_CONNECTION_STRING]"
PORT=3001
NODE_ENV=development
VITE_API_URL=http://localhost:3001
```

### 2. Get Neon Connection String

1. Go to https://console.neon.tech
2. Log into your project
3. Click "Connection string" on left sidebar
4. Copy the full string
5. Paste as DATABASE_URL value in .env

### 3. Apply Changes

**Stop and restart your servers:**

**Terminal 1:**
```bash
# Press Ctrl+C to stop
# Then run:
npm run server
```

**Check it worked:**
```
Visit: http://localhost:3001/api/db/status
```

Should show:
```json
{
  "connected": true,
  "mode": "Neon Production Relational DB",
  "database": "Neon PostgreSQL"
}
```

---

## npm Scripts (Defined in package.json)

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend) |
| `npm run server` | Start Express API (backend) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run db:migrate` | Create database tables |
| `npm run db:seed` | Populate sample data |
| `npm run db:setup` | Both migrate + seed |

---

## Common Workflows

### First Time Setup
```bash
# Terminal 1
npm install
npm run server

# Terminal 2 (new window)
npm run dev
```

### After Getting Neon Connection String
```bash
npm run db:setup
# (Wait for success message)
```

### Daily Development
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev

# Then visit http://localhost:5176
```

### Production Deployment
```bash
npm run build
# Deploy the /dist folder to your hosting
```

---

## File Locations (For Quick Reference)

**Backend Server:** `server/index.js`  
**Database Connection:** `server/db.js`  
**Database Schema:** `server/schema.sql`  
**Database Setup:** `server/migrate.js`  
**Sample Data:** `server/seed.js`  

**Frontend Entry:** `src/main.js`  
**Styling:** `src/style.css`  
**Navigation:** `src/nav.js`  

**Environment Variables:** `.env` (you create this)  
**Config Reference:** `.env.example`  

---

## URL Reference

| Page | URL |
|------|-----|
| Homepage | http://localhost:5176/ |
| Financial Health Assessment | http://localhost:5176/health-assessment.html |
| Goals Planner | http://localhost:5176/goals.html |
| Risk Assessment | http://localhost:5176/risk-assessment.html |
| Investment Planning | http://localhost:5176/investment-planning.html |
| Retirement Planner | http://localhost:5176/retirement-planner.html |
| Services | http://localhost:5176/services.html |
| About | http://localhost:5176/about.html |
| Contact | http://localhost:5176/contact.html |
| Insights | http://localhost:5176/insights.html |
| Net Worth Calculator | http://localhost:5176/net-worth-calculator.html |
| Savings Calculator | http://localhost:5176/savings-calculator.html |
| Calculators Hub | http://localhost:5176/calculators.html |
| API Status | http://localhost:3001/api/db/status |

---

## Essential npm Scripts to Remember

```bash
# These are the most important ones:

npm run server          # Start backend
npm run dev            # Start frontend
npm run db:setup       # Initialize database
npm run db:seed        # Add sample data
npm run build          # Create production bundle
```

---

## Pro Tips

✅ **Always run servers in separate terminal windows**  
✅ **Keep .env file in project root (not in subdirectories)**  
✅ **Never commit .env file to Git (it's in .gitignore)**  
✅ **Use `npm run dev` for development (hot reload enabled)**  
✅ **Use `npm run build` before deploying to production**  
✅ **Check `npm run` to see all available commands**  

---

## Questions?

Refer to these documentation files:
- **BUILD_COMPLETE.md** - Full project status overview
- **SETUP_GUIDE.md** - Step-by-step detailed guide
- **QUICK_START.md** - Quick reference with browser URLs

---

**Everything is ready to go! 🚀**
