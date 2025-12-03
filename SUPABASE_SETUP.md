# Supabase Setup Instructions

## Step 1: Create Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `ai-creative-generator`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
4. Click "Create new project"

## Step 2: Run Database Migration
1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor
5. Click **"Run"** or press Ctrl+Enter

## Step 3: Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal")

## Step 4: Update .env.local
Replace the placeholder values in `.env.local` with your actual keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Verification
After updating the keys, restart your dev server:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The app should now be able to connect to Supabase!
