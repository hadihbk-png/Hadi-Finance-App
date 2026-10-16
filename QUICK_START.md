# FINORA DATABASE SETUP - QUICK REFERENCE

## 🔑 Exact Steps to Add Your Neon Connection String

### Step 1: Get Your Neon Connection String
1. Go to https://console.neon.tech
2. Log in to your project
3. On the left sidebar, find "Connection string"
4. Click it
5. Copy the entire connection string (looks like):
   ```
   postgresql://user:password@ep-cool-water-a1b2c3d4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Create `.env` File in Project Root

**File Location:**
```
c:\Users\hadih\Hadi Financial Advisor\.env
```

**File Content:**
```
DATABASE_URL="postgresql://user:password@ep-xxxxxxxxxxxxx.region.aws.neon.tech/neondb?sslmode=require"
PORT=3001
NODE_ENV=development
VITE_API_URL=http://localhost:3001
```

**⚠️ REPLACE:** Replace the example connection string with YOUR actual Neon connection string

### Step 3: Verify `.env` is Safe
- Don't share this file
- Don't upload to GitHub
- It's already in `.gitignore`

## 🏃 Running the Application

### Terminal 1: Start Backend API Server
```bash
cd "c:\Users\hadih\Hadi Financial Advisor"
npm run dev:server
```

Expected output:
```
✓ FINORA API Server running on http://localhost:3001
✓ Database Connection: Neon PostgreSQL
✓ Sample Data Ready
```

### Terminal 2: Start Frontend (New Terminal Window)
```bash
cd "c:\Users\hadih\Hadi Financial Advisor"
npm run dev
```

Expected output:
```
VITE v6.2.0 ready in 123 ms
➜  Local: http://localhost:5175/
```

### Step 4: Open in Browser
- Open http://localhost:5175
- You should see the FINORA homepage

## 📊 Database Setup (First Time Only)

### Option A: Use Existing Database (If Tables Already Exist)
Skip this step - just run the servers above

### Option B: Create Tables (Fresh Database)

```bash
# In your terminal:
node server/migrate.js
```

Wait for: "✓ Database schema created successfully"

### Option C: Add Sample Data

```bash
# In your terminal:
node server/seed.js
```

Wait for: "✓ Sample data seeded successfully"

## ✅ Verify Everything is Working

### Check 1: Database Status
Visit: http://localhost:3001/api/db/status

You should see JSON showing connected status and table counts

### Check 2: Home Page
Visit: http://localhost:5175

You should see beautiful hero sections, services, and financial tools

### Check 3: Try a Calculator
Visit: http://localhost:5175/net-worth-calculator.html

Enter some numbers and see calculations work

### Check 4: Try Financial Health Assessment
Visit: http://localhost:5175/health-assessment.html

Click through the 6-step wizard and see results calculate

## 🗺️ All Available Pages

### Financial Tools
- ✓ http://localhost:5175/health-assessment.html
- ✓ http://localhost:5175/goals.html
- ✓ http://localhost:5175/risk-assessment.html
- ✓ http://localhost:5175/investment-planning.html
- ✓ http://localhost:5175/retirement-planner.html
- ✓ http://localhost:5175/calculators.html
- ✓ http://localhost:5175/net-worth-calculator.html
- ✓ http://localhost:5175/savings-calculator.html

### Information Pages
- ✓ http://localhost:5175/services.html
- ✓ http://localhost:5175/about.html
- ✓ http://localhost:5175/contact.html
- ✓ http://localhost:5175/insights.html

### Home
- ✓ http://localhost:5175/

## 📁 Project Structure

```
Hadi Financial Advisor/
├── .env                    ← ADD YOUR DATABASE_URL HERE
├── .env.example            (Reference only)
├── SETUP_GUIDE.md          (Full documentation)
├── package.json
├── index.html
├── vite.config.js
├── src/
│   ├── style.css           (Premium design system)
│   ├── main.js
│   ├── nav.js
│   └── currency.js
├── public/
│   └── images/
├── server/
│   ├── index.js            (Express API)
│   ├── db.js               (Database connection)
│   ├── schema.sql          (Table definitions)
│   ├── seed.js             (Sample data)
│   └── migrate.js          (Create tables)
├── *.html                  (All pages)
├── net-worth-calculator.html
├── savings-calculator.html
└── ... (other pages)
```

## 🔒 Security Checklist

Before deploying to production:
- [ ] .env file is in .gitignore
- [ ] .env not committed to Git
- [ ] DATABASE_URL kept private
- [ ] All credentials in environment variables
- [ ] HTTPS enabled
- [ ] Authentication system implemented
- [ ] Input validation on all forms
- [ ] SQL injection protection (using prepared statements)

## 🆘 If Something Breaks

### "Database connection failed"
1. Check `.env` file exists
2. Check DATABASE_URL is correct
3. Check Neon Console shows project as "Available"
4. Try refreshing database connection

### "Port 3001 already in use"
```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID [number] /F

# Try different port:
PORT=3002 npm run dev:server
```

### "Module not found"
```bash
# Reinstall dependencies
rm -r node_modules package-lock.json
npm install
```

### "Table already exists"
This is OK. Tables are created as "IF NOT EXISTS"

## 📞 Need Help?

1. Check SETUP_GUIDE.md for detailed instructions
2. Look at server logs in terminal
3. Check browser console (F12)
4. Verify DATABASE_URL in .env file
5. Contact Neon support for database issues

## 🎉 You're All Set!

1. ✅ Create `.env` with your Neon connection string
2. ✅ Run `npm run dev:server` (Terminal 1)
3. ✅ Run `npm run dev` (Terminal 2)
4. ✅ Open http://localhost:5175
5. ✅ Start exploring FINORA!

---

**Questions?** See SETUP_GUIDE.md for complete documentation
