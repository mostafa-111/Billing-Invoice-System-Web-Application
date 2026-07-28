# Invoice Billing System - Backend

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB instance)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd C:\backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `C:\backend` directory (if it doesn't exist) with the following variables:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

**Important:**
- Replace `your_mongodb_connection_string` with your actual MongoDB Atlas connection string
- Replace `your-secret-key-change-in-production` with a secure random string for JWT token signing
- The `PORT` is optional (defaults to 5000 if not specified)

### 3. Run the Backend Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

### 4. Verify the Server is Running

- Open your browser and go to: `http://localhost:5000/`
- You should see: `{"success":false,"message":"Route not found"}`

## API Endpoints

The API is available at `http://localhost:5000/api/`

### Available Routes:
- `/api/auth` - Authentication (register, login)
- `/api/invoices` - Invoice management
- `/api/users` - User management
- `/api/dashboard` - Dashboard data
- `/api/settings` - Application settings

## Default Admin User

On first run, the system automatically creates a default admin user:
- **Email:** `admin@invoiceapp.com`
- **Password:** `admin123`

**⚠️ Important:** Change this password immediately in production!

## Troubleshooting

### Server won't start
- Check if MongoDB connection string is correct in `.env`
- Ensure MongoDB Atlas allows connections from your IP address
- Verify that port 5000 is not already in use

### Connection errors
- Verify your `MONGO_URI` is correct
- Check your MongoDB Atlas network access settings
- Ensure your MongoDB cluster is running

