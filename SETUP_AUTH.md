# Supabase Authentication Setup Guide

## Prerequisites

Before you begin, make sure you have:
- Node.js installed (v18 or higher)
- A Supabase account (sign up at https://supabase.com)

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: Choose a name for your project (e.g., "DBSCL Agriculture")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Select closest region to your users
4. Click "Create new project" and wait for setup to complete (2-3 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase/schema.sql` in this project
4. Copy the ENTIRE contents of the file
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success:
   - You should see "Success. No rows returned"
   - Go to **Table Editor** and verify you see:
     - `profiles` table
     - `organizations` table

## Step 3: Get API Keys

1. In Supabase dashboard, go to **Settings** > **API**
2. Find these two values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 4: Configure Environment Variables

1. In your project root (where `package.json` is), create a file named `.env`
2. Copy the contents from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and replace with your actual values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Save the file

## Step 5: Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` and all other dependencies.

## Step 6: Start Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:5173` (or another port shown in terminal).

## Step 7: Test the Authentication

### Test Registration
1. Open the app in your browser
2. You should see the login page
3. Click "Đăng ký ngay" (Register now)
4. Fill in the registration form:
   - **Username**: `testuser1` (3-20 characters, alphanumeric + underscore)
   - **Password**: `Test1234` (min 8 chars, letters + numbers)
   - **Phone**: `0912345678` (Vietnamese phone format)
5. Click "Đăng ký" (Register)
6. If successful, you should be automatically logged in and see the dashboard

### Test Login
1. Sign out by clicking "Hồ sơ" (Profile) in navigation
2. Click "Đăng xuất" (Sign out)
3. You should be redirected to login page
4. Enter your username and password
5. Click "Đăng nhập" (Login)
6. You should be logged in and see the dashboard

### Verify Database
1. Go to Supabase Dashboard > **Table Editor**
2. Click on `profiles` table
3. You should see your test user with:
   - `id` (UUID)
   - `username` (testuser1)
   - `phone_number` (+84912345678)
   - `role` (farmer)
   - `created_at` and `updated_at` timestamps

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env` file exists in project root
- Make sure variable names start with `VITE_` (required for Vite)
- Restart dev server after creating/editing `.env`

### Error: "Tên đăng nhập đã tồn tại" (Username already exists)
- Username must be unique
- Try a different username
- Or delete the test user from Supabase dashboard

### Error: "Failed to fetch" or network errors
- Check that Supabase URL is correct
- Check that anon key is correct
- Make sure Supabase project is running (not paused)

### Profile not created after signup
- Check SQL Editor for errors when running schema
- Make sure the trigger `on_auth_user_created` exists:
  - Go to **Database** > **Triggers**
  - Should see trigger on `auth.users` table
- Check browser console for errors

### Session not persisting on refresh
- Check browser localStorage (DevTools > Application > Local Storage)
- Should see entries with `supabase.auth.token`
- If missing, check for browser extensions blocking localStorage

## Security Notes

1. **Never commit `.env` to git** - it's already in `.gitignore`
2. **Never share your anon key publicly** - though it's "public", keep it in `.env`
3. **Database Password** - Never needed in frontend, only for direct DB access
4. **RLS is enabled** - Users can only access their own data
5. **Passwords** - Never stored in code, always handled by Supabase Auth

## Next Steps

Now that authentication is working, you can:

1. **Customize the UI** - Modify login/register pages as needed
2. **Add more profile fields** - Update schema and add to profile page
3. **Implement password reset** - Use Supabase's password recovery
4. **Add email confirmation** - Enable in Supabase Auth settings
5. **Add social login** - Configure Google, GitHub, etc. in Supabase Auth

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard > **Logs** > **Auth Logs**
2. Check browser console for errors
3. Verify RLS policies are correctly set up
4. Test database functions manually in SQL Editor

## File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── supabase.ts         # Supabase client config
│   │   └── database.types.ts   # TypeScript database types
│   └── auth/
│       ├── auth.service.ts     # Auth operations (signup, signin, etc)
│       ├── auth.types.ts       # TypeScript types
│       └── validation.ts       # Input validation
├── contexts/
│   └── AuthContext.tsx         # Global auth state
├── components/
│   └── auth/
│       ├── ProtectedRoute.tsx  # Auth guard for protected pages
│       └── PublicRoute.tsx     # Guard for login/register pages
├── pages/
│   └── auth/
│       ├── LoginPage.tsx       # Login UI
│       ├── RegisterPage.tsx    # Registration UI
│       └── ProfilePage.tsx     # User profile
└── app/
    └── App.tsx                 # Main app with auth integration
```
