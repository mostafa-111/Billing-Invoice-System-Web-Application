# Access Control Documentation

## Overview

The Invoice Billing System implements role-based access control (RBAC) with two user roles:
- **Admin**: Full access to all features
- **User**: Limited access to own resources only

## User Roles

### Admin User
- Can access admin dashboard
- Can view, create, edit, and delete all invoices
- Can manage users (create, update, delete, activate/deactivate)
- Can access and modify system settings
- Can export invoices as CSV
- Can view all invoices across all users

### Normal User
- Can access user dashboard
- Can view, create, edit, and delete **only their own invoices**
- Cannot access admin dashboard
- Cannot manage users
- Cannot access system settings
- Cannot view other users' invoices

## Backend Route Protection

### Admin-Only Routes
These routes require admin authentication:

1. **`/api/users`** (all methods)
   - Protected by: `authenticate` + `isAdmin` middleware
   - Allows: View, create, update, delete users

2. **`/api/settings`** (all methods)
   - Protected by: `authenticate` + `isAdmin` middleware
   - Allows: View and update company settings, export CSV

3. **`/api/dashboard/admin`**
   - Protected by: `authenticate` + role check
   - Returns: System-wide statistics

### User-Accessible Routes
These routes are accessible to all authenticated users:

1. **`/api/dashboard/user`**
   - Protected by: `authenticate` only
   - Returns: User's own statistics

2. **`/api/invoices`**
   - Protected by: `authenticate` only
   - **GET**: Users see only their invoices, admins see all
   - **POST**: Users can create invoices (assigned to themselves)
   - **PUT/DELETE**: Users can only modify their own invoices, admins can modify any

### Authentication Routes
- **`/api/auth/register`**: Public (creates user role by default)
- **`/api/auth/login`**: Public
- **`/api/auth/me`**: Requires authentication

## Frontend Access Control

### Page Access
- **`admin-dashboard.html`**: Only accessible to admin users
  - Non-admin users are automatically redirected to `dashboard.html`
  - Uses `requireAdmin()` function

- **`dashboard.html`**: Accessible to all authenticated users
  - Admin users are automatically redirected to `admin-dashboard.html`
  - Uses `requireAuth()` function

### API Request Handling
- All API requests include JWT token in Authorization header
- 403 (Forbidden) errors automatically redirect non-admin users
- 401 (Unauthorized) errors redirect to login page

## Default Admin Account

On first server start, a default admin account is created:
- **Email**: `admin@invoiceapp.com`
- **Password**: `admin123`

⚠️ **Important**: Change this password in production!

## Security Features

1. **JWT Token Authentication**: All protected routes require valid JWT token
2. **Role-Based Middleware**: Backend validates user role before allowing access
3. **Resource Ownership**: Users can only access their own invoices
4. **Automatic Redirects**: Frontend prevents unauthorized page access
5. **Error Handling**: Proper error messages for access denied scenarios

## Testing Access Control

### Test Admin Access
1. Login as admin (`admin@invoiceapp.com` / `admin123`)
2. Should redirect to `admin-dashboard.html`
3. Can access:
   - All invoices
   - User management
   - System settings
   - CSV export

### Test Normal User Access
1. Register a new account (or login as normal user)
2. Should redirect to `dashboard.html`
3. Can access:
   - Own invoices only
   - Create new invoices
4. Cannot access:
   - Admin dashboard (redirects to user dashboard)
   - User management API (returns 403)
   - Settings API (returns 403)
   - Other users' invoices (returns 403)

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

