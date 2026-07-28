# Quick Start Guide - Invoice Billing System

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Backend

```bash
cd C:\backend
npm install          # Only needed first time
npm run dev          # Starts server with auto-reload
```

**Expected output:**
```
✅ Connected to MongoDB Atlas
🚀 Server running on port 5000
```

**Verify:** Open `http://localhost:5000/` in browser
- Should show: `{"success":false,"message":"Route not found"}`

### Step 2: Start the Frontend

**Option A - Simple (Open directly):**
- Navigate to `C:\frontend`
- Double-click `index.html` to open in browser

**Option B - With local server (Recommended):**
```bash
cd C:\frontend
python -m http.server 8000
# OR
npx http-server -p 8000
```
Then open: `http://localhost:8000`

### Step 3: Access the Application

- **Frontend:** `http://localhost:8000` (or open `index.html` directly)
- **Backend API:** `http://localhost:5000/api`

## 📋 Prerequisites Checklist

- [ ] Node.js installed (check with `node --version`)
- [ ] MongoDB Atlas account or local MongoDB
- [ ] `.env` file in `C:\backend` with `MONGO_URI` set
- [ ] Dependencies installed (`npm install` in backend)

## 🔧 Configuration

### Backend `.env` file (`C:\backend\.env`):
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
PORT=5000
JWT_SECRET=your-secret-key-here
```

### Frontend API URL (`C:\frontend\js\config.js`):
- Default: `http://localhost:5000/api`
- Change if backend runs on different port/URL

## 👤 Default Login Credentials

- **Email:** `admin@invoiceapp.com`
- **Password:** `admin123`

## 🐛 Troubleshooting

### Backend won't start
1. Check `.env` file exists and has `MONGO_URI`
2. Verify MongoDB connection string is correct
3. Check MongoDB Atlas network access allows your IP

### Frontend can't connect to backend
1. Verify backend is running: `http://localhost:5000/`
2. Check browser console for CORS errors
3. Ensure API URL in `config.js` matches backend URL

### Port already in use
- Change `PORT` in `.env` file
- Update `API_BASE_URL` in `frontend/js/config.js` to match

## 📚 More Information

- Backend details: See `C:\backend\README.md`
- Frontend details: See `C:\frontend\README.md`

