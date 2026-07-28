# Invoice Billing System - Frontend

## Overview

This is a static HTML/CSS/JavaScript frontend application that connects to the backend API.

## Setup Instructions

### Option 1: Open Directly in Browser (Simplest)

1. Make sure the backend server is running on `http://localhost:5000`
2. Open `index.html` directly in your browser
   - Double-click `index.html`, or
   - Right-click → Open with → Your browser

### Option 2: Use a Local Web Server (Recommended)

**Using Python (if installed):**
```bash
cd C:\frontend
python -m http.server 8000
```
Then open: `http://localhost:8000`

**Using Node.js http-server:**
```bash
# Install http-server globally (one time)
npm install -g http-server

# Run the server
cd C:\frontend
http-server -p 8000
```
Then open: `http://localhost:8000`

**Using VS Code Live Server:**
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Configuration

The frontend is configured to connect to the backend API at:
- **API Base URL:** `http://localhost:5000/api`

This is set in `js/config.js`. If your backend runs on a different port or URL, update the `API_BASE_URL` constant in that file.

## Pages

- `index.html` - Landing page
- `login.html` - User login
- `register.html` - User registration
- `dashboard.html` - User dashboard
- `admin-dashboard.html` - Admin dashboard
- `create-invoice.html` - Create new invoice
- `edit-invoice.html` - Edit existing invoice

## Requirements

- Backend server must be running on `http://localhost:5000`
- Modern web browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled

## Troubleshooting

### CORS Errors
- Ensure the backend server is running
- Check that `cors` middleware is enabled in the backend
- Verify the API URL in `js/config.js` matches your backend URL

### API Connection Failed
- Verify backend is running: `http://localhost:5000/`
- Check browser console for specific error messages
- Ensure backend and frontend are on the same network/localhost

