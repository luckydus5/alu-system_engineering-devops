# HQ Power System - Setup & Configuration Guide

## Prerequisites

- **Node.js** 16.x or higher
- **npm** or **bun** package manager
- **Git** for version control
- **Supabase** account (free tier available)
- **GitHub** account for repository hosting

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to https://supabase.com and sign in
2. Click "New project"
3. Configure:
   - **Name**: hqpower_system
   - **Database Password**: Set a strong password
   - **Region**: Choose closest to your location
4. Wait for project initialization (5-10 minutes)

### 1.2 Enable Authentication
1. In Supabase Dashboard, go to **Authentication** > **Providers**
2. Enable "Email" provider
3. Configure email settings if needed

### 1.3 Get API Keys
1. Go to **Settings** > **API**
2. Copy:
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon public** key (VITE_SUPABASE_PUBLISHABLE_KEY)
3. Save these for later

### 1.4 Run Database Migrations
1. Go to **SQL Editor**
2. Create a new query
3. Copy the contents of `exports/complete-database-schema.sql`
4. Paste into the SQL editor
5. Click "Run"
6. Repeat for the migration files in `supabase/migrations/`

## Step 2: Local Development Setup

### 2.1 Clone Repository
```bash
git clone https://github.com/Powerpl123/hqpower_system.git
cd hqpower_system
```

### 2.2 Install Dependencies
Using npm:
```bash
npm install
```

Or using bun (faster):
```bash
bun install
```

### 2.3 Configure Environment Variables
1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### 2.4 Start Development Server
```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

## Step 3: Initial Data Setup

### 3.1 Create Admin User
1. Visit `http://localhost:5173/auth`
2. Sign up with admin email
3. Go to Supabase Dashboard > **SQL Editor**
4. Run:
```sql
-- Set user as admin
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@example.com';
```

### 3.2 Create Test Departments
1. In Supabase Dashboard > **SQL Editor**
2. Run:
```sql
INSERT INTO public.departments (code, name, description) 
VALUES 
  ('HQ', 'Headquarters', 'Main office'),
  ('FIELD', 'Field Operations', 'Field work teams'),
  ('MAINT', 'Maintenance', 'Maintenance department');
```

### 3.3 Grant Department Access
```sql
-- Get your user ID from the dashboard
INSERT INTO public.user_department_access (user_id, department_id, granted_by)
SELECT u.id, d.id, u.id
FROM auth.users u, public.departments d
WHERE u.email = 'admin@example.com';
```

## Step 4: Development Workflow

### 4.1 Running the Application
```bash
npm run dev
```

### 4.2 Building for Production
```bash
npm run build
```

### 4.3 Preview Production Build
```bash
npm run preview
```

### 4.4 Linting Code
```bash
npm run lint
```

## Step 5: Deployment to Vercel

### 5.1 Prepare Repository
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 5.2 Connect to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the build settings

### 5.3 Set Environment Variables
1. In Vercel Project Settings > **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Click "Deploy"

### 5.4 Monitor Deployment
- Vercel automatically deploys on push to `main`
- Check deployment status in Vercel dashboard
- View logs for build errors

## Step 6: Database Backup & Recovery

### 6.1 Export Data
In Supabase Dashboard:
1. Go to **SQL Editor**
2. Run export queries to backup data
3. Save SQL files

### 6.2 Restore Data
1. Prepare new Supabase project
2. Run schema setup again
3. Import data using SQL files

## Configuration Files

### `vite.config.ts`
- Vite build configuration
- Port settings
- TypeScript paths

### `tailwind.config.ts`
- Tailwind CSS customization
- Theme colors
- Component styling

### `tsconfig.json`
- TypeScript compiler options
- Path aliases (@/)

### `package.json`
- Dependencies
- Scripts
- Project metadata

### `vercel.json`
- Vercel deployment settings
- Build and output directories

## Common Issues & Troubleshooting

### Issue: "Cannot find VITE_SUPABASE_URL"
**Solution**: Check `.env` file exists and variables are set correctly

### Issue: "User not found" after signup
**Solution**: Check that `user_roles` trigger is set up in database

### Issue: Blank dashboard after login
**Solution**: Verify department access is granted to user in `user_department_access` table

### Issue: Build fails with TypeScript errors
**Solution**: Run `npm run lint` to identify issues, fix them

### Issue: Supabase connection refused
**Solution**: 
1. Verify Supabase URL is correct
2. Check internet connection
3. Verify API key permissions

## Environment Setup Tips

### Visual Studio Code Extensions (Recommended)
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- Supabase CLI
- Thunder Client (API testing)

### Recommended Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Git Configuration
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## Performance Optimization Tips

1. **Enable Vite Caching**: Already configured
2. **Tailwind Purging**: Configured for production
3. **React Query Caching**: Default 5-minute stale time
4. **Code Splitting**: Routes automatically split

## Security Best Practices

1. **Never commit .env files**: Already in .gitignore
2. **Use strong passwords**: For Supabase and GitHub
3. **Enable 2FA**: On Supabase and GitHub accounts
4. **Rotate API keys**: Quarterly or when needed
5. **Monitor logs**: Check Supabase and Vercel logs regularly

## Next Steps

1. ✅ Complete setup guide
2. Customize branding (update logo and colors)
3. Create additional departments as needed
4. Set up team members and roles
5. Configure email templates in Supabase
6. Set up backup schedules
7. Create monitoring alerts

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **Vite Guide**: https://vitejs.dev

## Database Connection Info

After setup, you can access:
- **Supabase Dashboard**: https://app.supabase.com
- **PostgreSQL Connection**: Available in Settings > Database
- **API Documentation**: Supabase > API Docs in dashboard